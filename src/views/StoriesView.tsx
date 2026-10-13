import React, { useState } from 'react';
import {
  ISLAMIC_STORIES,
  IslamicStoryItem,
  StoryCategory,
} from '../data/storiesAndExploreData';
import {
  ChevronRight,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Search,
} from 'lucide-react';
import { VoiceAssistant } from '../services/voiceAssistantService';

interface StoriesViewProps {
  onBack?: () => void;
}

export const StoriesView: React.FC<StoriesViewProps> = ({ onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeStory, setActiveStory] = useState<IslamicStoryItem | null>(null);
  const [isSpeakingStory, setIsSpeakingStory] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<number>(1);

  const categories: { id: StoryCategory; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'prophets', label: 'الأنبياء' },
    { id: 'companions', label: 'الصحابة' },
    { id: 'lessons', label: 'العبر والدروس' },
  ];

  const filteredStories = ISLAMIC_STORIES.filter((story) => {
    const matchesCat =
      selectedCategory === 'all' || story.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      story.title.includes(searchQuery.trim()) ||
      story.subtitle.includes(searchQuery.trim());
    return matchesCat && matchesSearch;
  });

  const handleToggleNarrateStory = (story: IslamicStoryItem) => {
    if (isSpeakingStory) {
      VoiceAssistant.stopSpeaking();
      setIsSpeakingStory(false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const fullText = `${story.title}. ${story.paragraphs.join(' ')}`;
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeakingStory(false);
        utterance.onerror = () => setIsSpeakingStory(false);
        setIsSpeakingStory(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeakingStory(false);
      }
    }
  };

  const handleCloseStory = () => {
    if (isSpeakingStory && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeakingStory(false);
    setActiveStory(null);
  };

  return (
    <div className="athar-page-container text-right">
      {/* Top Luxury Header (Matches Reference Showcase) */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#C8A24A]/25">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[#14120E] border border-[#C8A24A]/35 flex items-center justify-center text-[#E6C66E] hover:bg-[#1E1B14] transition-colors"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>
        <h1 className="text-lg font-extrabold text-white tracking-wide">
          القصص الإسلامية
        </h1>
        <div className="w-9" />
      </div>

      {/* Category Filter Pills (الكل · الأنبياء · الصحابة · العبر والدروس) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-[#E6C66E] to-[#C8A24A] text-[#070707] border-[#F3E5AB] shadow-[0_4px_15px_rgba(200,162,74,0.35)]'
                  : 'bg-[#12110E] text-[#C4B998] border-[#C8A24A]/25 hover:border-[#C8A24A]/60 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Subtle Search Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C8A24A]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في قصص الأنبياء والصحابة والعبر..."
          className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-[#11100E] border border-[#C8A24A]/25 text-xs text-white placeholder-[#9E9478] focus:outline-none focus:border-[#E6C66E]"
        />
      </div>

      {/* Stories List (Matches Luxury Black & Gold Reference Showcase Cards) */}
      <div className="space-y-3">
        {filteredStories.map((story) => (
          <button
            key={story.id}
            onClick={() => setActiveStory(story)}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#161410] via-[#11100D] to-[#0D0C0A] border border-[#C8A24A]/30 hover:border-[#E6C66E]/70 p-3 text-right flex items-center justify-between gap-3.5 transition-all duration-200 active:scale-[0.99] shadow-lg"
          >
            {/* Right Thumbnail Image with Golden Frame */}
            <div className="relative w-20 h-22 rounded-xl overflow-hidden border border-[#C8A24A]/40 shrink-0">
              <img
                src={story.imageUrl}
                alt={story.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070707]/80 via-transparent to-transparent" />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#070707]/85 border border-[#C8A24A]/40 text-[9px] font-bold text-[#E6C66E]">
                {story.categoryArabic}
              </span>
            </div>

            {/* Center Story Title, Subtitle & Duration */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <h3 className="text-sm font-extrabold text-white group-hover:text-[#E6C66E] transition-colors leading-snug">
                  {story.title}
                </h3>
                <p className="text-[11px] text-[#C4B998] mt-1 leading-relaxed">
                  {story.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#C8A24A] font-bold mt-2.5">
                <Clock size={12} />
                <span>{story.durationMinutes} دقيقة</span>
              </div>
            </div>

            {/* Left Calligraphic Golden Badge (Matches Reference Showcase) */}
            <div className="shrink-0 pl-1 flex flex-col items-center justify-center">
              <span className="font-quran text-base font-bold text-[#E6C66E] bg-[#1A1710] border border-[#C8A24A]/35 px-2.5 py-1.5 rounded-xl shadow-inner">
                {story.calligraphyBadge}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Full Story Reader Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg h-[92dvh] sm:h-[86vh] bg-[#0B0A08] border-t sm:border border-[#C8A24A]/50 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl text-right">
            {/* Modal Hero Header */}
            <div className="relative h-44 shrink-0 overflow-hidden border-b border-[#C8A24A]/35">
              <img
                src={activeStory.imageUrl}
                alt={activeStory.title}
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A08] via-[#0B0A08]/55 to-transparent" />

              {/* Top Controls inside Hero */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[#070707]/85 border border-[#C8A24A]/50 text-[#E6C66E] text-xs font-extrabold">
                  {activeStory.categoryArabic} · {activeStory.durationMinutes} دقيقة
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleNarrateStory(activeStory)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      isSpeakingStory
                        ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                        : 'bg-[#070707]/85 text-[#E6C66E] border-[#C8A24A]/50 hover:bg-[#171510]'
                    }`}
                  >
                    {isSpeakingStory ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isSpeakingStory ? 'إيقاف القراءة الصوتية' : 'استماع للقصة'}</span>
                  </button>
                  <button
                    onClick={handleCloseStory}
                    className="w-8 h-8 rounded-xl bg-[#070707]/85 border border-[#C8A24A]/40 text-white hover:text-[#E6C66E] flex items-center justify-center"
                    aria-label="إغلاق"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Story Title at Bottom of Hero */}
              <div className="absolute bottom-3 inset-x-5">
                <h2 className="text-xl font-extrabold text-white">
                  {activeStory.title}
                </h2>
                <p className="text-xs text-[#E6C66E] font-medium mt-0.5">
                  {activeStory.subtitle}
                </p>
              </div>
            </div>

            {/* Story Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Quranic Ayah Highlight Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#17140D] to-[#0F0E0A] border border-[#C8A24A]/45 text-center space-y-1.5 shadow-inner">
                <p className="font-quran text-lg sm:text-xl text-[#E6C66E] leading-loose">
                  {activeStory.quranicVerse}
                </p>
                <span className="text-[11px] text-[#C4B998] block font-bold">
                  {activeStory.quranicSource}
                </span>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#12110E] border border-[#C8A24A]/20 text-xs">
                <span className="text-[#C4B998] font-bold flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#C8A24A]" />
                  <span>حجم خط القراءة:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { scale: 0.95, label: 'عادي' },
                    { scale: 1.1, label: 'متوسط' },
                    { scale: 1.25, label: 'كبير' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setFontScale(opt.scale)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        fontScale === opt.scale
                          ? 'bg-[#C8A24A] text-[#070707] border-[#F3E5AB]'
                          : 'bg-[#090806] text-[#C4B998] border-[#C8A24A]/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Narrative Paragraphs */}
              <div
                style={{ fontSize: `${fontScale * 0.96}rem` }}
                className="space-y-3.5 text-white/95 leading-loose font-normal"
              >
                {activeStory.paragraphs.map((para, idx) => (
                  <p
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#11100D] border border-[#C8A24A]/20 leading-relaxed"
                  >
                    {para}
                  </p>
                ))}
              </div>

              {/* Extracted Spiritual Lessons */}
              <div className="p-4 rounded-2xl bg-[#15130E] border border-[#C8A24A]/40 space-y-2.5">
                <div className="flex items-center gap-2 text-[#E6C66E] font-extrabold text-sm">
                  <Sparkles size={16} />
                  <span>العبر والدروس المستفادة من القصة</span>
                </div>
                <div className="space-y-2">
                  {activeStory.lessons.map((lesson, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white leading-relaxed">
                      <CheckCircle2 size={14} className="text-[#C8A24A] shrink-0 mt-0.5" />
                      <span>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
