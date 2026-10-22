import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  BookOpen,
  Flame,
  Sparkles,
  Heart,
  ChevronLeft,
} from 'lucide-react';
import { CommunityGroup, GroupCategory } from '../../types';
import { GamaaGroupsService } from '../../services/gamaaGroupsService';
import { GamaaCreateGroupModal } from './GamaaCreateGroupModal';
import { GamaaGroupDetailModal } from './GamaaGroupDetailModal';

interface GamaaGroupsListProps {
  currentUserUid: string;
  isSystemOwner?: boolean;
  userProfile?: { displayName?: string; photoURL?: string; level?: number };
  onOpenAuth?: () => void;
  onReportPost?: (postId: string, snippet: string) => void;
}

const CATEGORY_TABS: { id: string; label: string; icon: any }[] = [
  { id: 'all', label: 'الكل', icon: Users },
  { id: 'quran', label: 'القرآن', icon: BookOpen },
  { id: 'dhikr', label: 'الذكر', icon: Flame },
  { id: 'knowledge', label: 'العلم', icon: Sparkles },
  { id: 'charity', label: 'الإحسان', icon: Heart },
  { id: 'general', label: 'أخوة', icon: Users },
];

export const GamaaGroupsList: React.FC<GamaaGroupsListProps> = ({
  currentUserUid,
  isSystemOwner = false,
  userProfile,
  onOpenAuth,
  onReportPost,
}) => {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [groupsTab, setGroupsTab] = useState<'all' | 'mine'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Real-time Firestore subscription to groups
  useEffect(() => {
    setLoading(true);
    const unsub = GamaaGroupsService.listenToGroups(activeCategory, (fetchedGroups) => {
      setGroups(fetchedGroups);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCategory]);

  // Filter groups by search query and "mine" tab
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (groupsTab === 'mine') {
      result = result.filter((g) => g.creatorId === currentUserUid);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [groups, groupsTab, searchQuery, currentUserUid]);

  const handleOpenCreateModal = () => {
    if (!currentUserUid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setIsCreateModalOpen(true);
  };

  const getCategoryIcon = (cat: GroupCategory) => {
    switch (cat) {
      case 'quran':
        return <BookOpen size={14} className="text-[#E6C66E]" />;
      case 'dhikr':
        return <Flame size={14} className="text-amber-400" />;
      case 'knowledge':
        return <Sparkles size={14} className="text-[#FFE294]" />;
      case 'charity':
        return <Heart size={14} className="text-emerald-400" />;
      default:
        return <Users size={14} className="text-[#C8A24A]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Action Bar */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div>
          <h3 className="text-sm font-extrabold text-[#FFE294] flex items-center gap-2">
            <Users size={16} className="text-[#E6C66E]" />
            <span>حلقات الذكر والمدارسة</span>
          </h3>
          <p className="text-[11px] text-[#A69E89]">
            اجتمع مع إخوانك في الله على مدارسة القرآن والأذكار
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>إنشاء حلقة جديدة</span>
        </button>
      </div>

      {/* 2. Search & Tab Filter */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن حلقة بالاسم أو الوصف..."
            className="w-full min-h-[44px] pr-9 pl-4 rounded-xl bg-[#120F0A] border border-[#C8A24A]/25 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#E6C66E]"
          />
          <Search size={15} className="absolute right-3 top-3.5 text-[#8E8672]" />
        </div>

        {/* Directory Sub-Tabs ("جميع الحلقات" vs "حلقاتي") */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-[#120F0A] border border-[#C8A24A]/20 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGroupsTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                groupsTab === 'all'
                  ? 'bg-[#E6C66E] text-black'
                  : 'text-[#9E9478] hover:text-white'
              }`}
            >
              جميع الحلقات
            </button>
            <button
              type="button"
              onClick={() => {
                if (!currentUserUid && onOpenAuth) {
                  onOpenAuth();
                  return;
                }
                setGroupsTab('mine');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                groupsTab === 'mine'
                  ? 'bg-[#E6C66E] text-black'
                  : 'text-[#9E9478] hover:text-white'
              }`}
            >
              حلقاتي
            </button>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#C8A24A]/25 border-[#E6C66E] text-[#FFE294]'
                    : 'bg-[#120F0A] border-[#C8A24A]/15 text-[#8E8672] hover:text-[#C4B998]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Groups Directory List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#C4B998]">
            جاري استحضار حلقات الذكر والمجموعات...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#120F0A] border border-[#C8A24A]/20 text-center space-y-2">
            <Users size={32} className="mx-auto text-[#C8A24A]/40" />
            <p className="text-xs text-[#A69E89]">
              {groupsTab === 'mine'
                ? 'لم تنشئ أي حلقة بعد، اضغط على زر إنشاء حلقة لتأسيس حلقتك الإيمانية الأولى'
                : 'لا توجد حلقات مطابقة للبحث حالياً'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className="p-4 rounded-2xl bg-[#141009] border border-[#C8A24A]/25 hover:border-[#C8A24A]/50 transition-all space-y-2 cursor-pointer shadow-md hover:shadow-lg active:scale-99"
            >
              {/* Group Meta Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#241E12] border border-[#C8A24A]/30">
                    {getCategoryIcon(group.category)}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      group.isPrivate
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {group.isPrivate ? (
                      <>
                        <Lock size={10} />
                        <span>خاصة</span>
                      </>
                    ) : (
                      <>
                        <Globe size={10} />
                        <span>عامة</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#FFE294] font-bold">
                  <span>دخول الحلقة</span>
                  <ChevronLeft size={14} />
                </div>
              </div>

              {/* Group Name & Description */}
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">{group.name}</h4>
                <p className="text-[11px] text-[#C4B998] leading-relaxed line-clamp-2">
                  {group.description}
                </p>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between pt-2 border-t border-[#C8A24A]/15 text-[10px] text-[#8E8672]">
                <div className="flex items-center gap-3">
                  <span>{group.membersCount} عضواً</span>
                  <span>•</span>
                  <span>{group.postsCount || 0} خاطرة</span>
                </div>
                <span>المؤسس: {group.creatorName || 'عضو أثر'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Modals */}
      <GamaaCreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={(id) => {
          setSelectedGroupId(id);
        }}
        userProfile={userProfile}
      />

      {selectedGroupId && (
        <GamaaGroupDetailModal
          isOpen={Boolean(selectedGroupId)}
          onClose={() => setSelectedGroupId(null)}
          groupId={selectedGroupId}
          currentUserUid={currentUserUid}
          isSystemOwner={isSystemOwner}
          userProfile={userProfile}
          onReportPost={onReportPost}
        />
      )}
    </div>
  );
};
