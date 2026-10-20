import React, { useState, useEffect, useRef } from 'react';
import { CURATED_ISLAMIC_IMAGES } from '../data/islamicImagesData';
import { X, Download, Share2, Check, Image as ImageIcon, Sparkles, BookOpen, Heart } from 'lucide-react';
import { AtharBrandLogo } from './AtharBrandLogo';
import atharImperialTreeCrest from '../assets/images/athar_imperial_tree_crest_trimmed.webp';

export interface ShareCardPayload {
  category: 'ayah' | 'hadith' | 'dhikr';
  title: string;
  mainText: string;
  sourceLabel: string;
  subtitleOrTafsir?: string;
}

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayload?: ShareCardPayload | null;
}

interface CardThemeOption {
  id: string;
  name: string;
  bgUrl: string;
  accentColor: string;
  gradientTop: string;
  gradientBottom: string;
}

const CARD_THEMES: CardThemeOption[] = [
  {
    id: 'kaaba_gold',
    name: 'الكعبة المشرفة',
    bgUrl: CURATED_ISLAMIC_IMAGES.kaaba_night.src,
    accentColor: '#E6C66E',
    gradientTop: 'rgba(12, 10, 7, 0.72)',
    gradientBottom: 'rgba(7, 6, 4, 0.95)'
  },
  {
    id: 'nabawi_emerald',
    name: 'المسجد النبوي',
    bgUrl: CURATED_ISLAMIC_IMAGES.madinah_dome.src,
    accentColor: '#E6C66E',
    gradientTop: 'rgba(14, 12, 8, 0.72)',
    gradientBottom: 'rgba(8, 7, 5, 0.95)'
  },
  {
    id: 'quran_sanctuary',
    name: 'محراب القرآن',
    bgUrl: CURATED_ISLAMIC_IMAGES.quran_lanterns.src,
    accentColor: '#F3E5AB',
    gradientTop: 'rgba(18, 15, 10, 0.74)',
    gradientBottom: 'rgba(10, 8, 6, 0.95)'
  },
  {
    id: 'night_serenity',
    name: 'سكينة الفجر',
    bgUrl: CURATED_ISLAMIC_IMAGES.kaaba_dawn.src,
    accentColor: '#D4AF37',
    gradientTop: 'rgba(15, 13, 9, 0.75)',
    gradientBottom: 'rgba(8, 7, 5, 0.95)'
  }
];

const DEFAULT_PRESETS: ShareCardPayload[] = [
  {
    category: 'ayah',
    title: 'نفحة قرآنية مباركة',
    mainText: '﴿الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾',
    sourceLabel: 'سورة الرعد · الآية ٢٨',
    subtitleOrTafsir: 'طمأنينة النفس وراحة البال وسكون القلب بذكر الرحمن'
  },
  {
    category: 'hadith',
    title: 'نفحة نبوية شريفة',
    mainText: '«كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ»',
    sourceLabel: 'متفق عليه · عن أبي هريرة رضي الله عنه',
    subtitleOrTafsir: 'من أعظم كنوز الذكر المضاعفة في الأجر واليسيرة على اللسان'
  },
  {
    category: 'dhikr',
    title: 'من أذكار الحفظ والفرج',
    mainText: '«حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ»',
    sourceLabel: 'أذكار الصباح والمساء (٧ مرات)',
    subtitleOrTafsir: 'من قالها حين يصبح وحين يمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة'
  }
];

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen,
  onClose,
  initialPayload
}) => {
  const [payload, setPayload] = useState<ShareCardPayload>(initialPayload || DEFAULT_PRESETS[0]);
  const [selectedTheme, setSelectedTheme] = useState<CardThemeOption>(CARD_THEMES[0]);
  const [includeSubtitle, setIncludeSubtitle] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPayload) {
        setPayload(initialPayload);
        if (initialPayload.category === 'hadith') {
          setSelectedTheme(CARD_THEMES[1]);
        } else if (initialPayload.category === 'dhikr') {
          setSelectedTheme(CARD_THEMES[3]);
        } else {
          setSelectedTheme(CARD_THEMES[0]);
        }
      }
      setStatusMessage(null);
    }
  }, [isOpen, initialPayload]);

  useEffect(() => {
    if (isOpen) {
      renderCardToCanvas();
    }
  }, [isOpen, payload, selectedTheme, includeSubtitle]);

  if (!isOpen) return null;

  const wrapArabicLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const renderCardToCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Base luxury obsidian background
    ctx.fillStyle = '#080705';
    ctx.fillRect(0, 0, width, height);

    // 2. Load and draw Islamic background image
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = selectedTheme.bgUrl;
      });
      if (img.complete && img.naturalWidth > 0) {
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        const dx = (width - drawW) / 2;
        const dy = (height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      }
    } catch {
      // Fallback gradient if image fails
    }

    // 3. Rich atmospheric scrim overlay
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, selectedTheme.gradientTop);
    grad.addColorStop(0.5, 'rgba(11, 10, 7, 0.85)');
    grad.addColorStop(1, selectedTheme.gradientBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 4. Ornamental Islamic Frame Border
    ctx.strokeStyle = selectedTheme.accentColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.65;
    ctx.strokeRect(54, 54, width - 108, height - 108);

    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.32;
    ctx.strokeRect(70, 70, width - 140, height - 140);
    ctx.globalAlpha = 1;

    // 5. Top Header Brand & Category Title
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    ctx.fillStyle = selectedTheme.accentColor;
    ctx.font = 'bold 30px "Cairo", "Amiri", sans-serif';
    ctx.fillText(`— ${payload.title} —`, width / 2, 145);

    // Subtle divider line
    ctx.strokeStyle = selectedTheme.accentColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 140, 175);
    ctx.lineTo(width / 2 + 140, 175);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 6. Main Sacred Arabic Text (Ayah / Hadith / Dhikr)
    ctx.fillStyle = '#FFFFFF';
    const textLen = payload.mainText.length;
    const mainFontSize = textLen > 220 ? 40 : textLen > 140 ? 46 : 54;
    ctx.font = `bold ${mainFontSize}px "Amiri Quran", "Amiri", "Traditional Arabic", serif`;

    const mainLines = wrapArabicLines(ctx, payload.mainText, width - 220);
    const lineHeight = mainFontSize * 1.75;
    const totalMainHeight = mainLines.length * lineHeight;

    let startY = includeSubtitle && payload.subtitleOrTafsir
      ? Math.max(270, (height - totalMainHeight) / 2 - 55)
      : Math.max(290, (height - totalMainHeight) / 2);

    for (const line of mainLines) {
      ctx.fillText(line, width / 2, startY);
      startY += lineHeight;
    }

    // 7. Source Attribution (Surah & Ayah or Hadith Source)
    startY += 20;
    ctx.fillStyle = selectedTheme.accentColor;
    ctx.font = 'bold 30px "Cairo", sans-serif';
    ctx.fillText(payload.sourceLabel, width / 2, startY);

    // 8. Optional Tafsir / Explanation Box
    if (includeSubtitle && payload.subtitleOrTafsir) {
      startY += 58;
      ctx.fillStyle = '#F3E5AB';
      ctx.font = '25px "Cairo", sans-serif';
      const subLines = wrapArabicLines(ctx, payload.subtitleOrTafsir, width - 240).slice(0, 3);
      for (const sLine of subLines) {
        if (startY < height - 145) {
          ctx.fillText(sLine, width / 2, startY);
          startY += 42;
        }
      }
    }

    // 9. Bottom Signature Footer with Royal Athar Emblem
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = atharImperialTreeCrest;
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = 72;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        const logoX = width / 2 - logoW / 2;
        const logoY = height - 180;
        ctx.save();
        ctx.shadowColor = 'rgba(214, 179, 106, 0.45)';
        ctx.shadowBlur = 14;
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        ctx.restore();
      }
    } catch {}

    ctx.fillStyle = 'rgba(230, 198, 110, 0.9)';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.fillText('تطبيق أَثَـــــر | ATHAR · رفيقك اليومي للقرآن والصلاة والذكر', width / 2, height - 82);

    return canvas;
  };

  const handleDownloadCard = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderCardToCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `athar-card-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage('تم حفظ البطاقة المصورة بجودة عالية في جهازك ✓');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch {
      setStatusMessage('تعذر حفظ الصورة حالياً');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareCard = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderCardToCanvas();
      if (!canvas) return;

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
      );

      if (blob && navigator.share) {
        const file = new File([blob], `athar-${Date.now()}.png`, { type: 'image/png' });
        const shareData: ShareData = {
          title: payload.title,
          text: `${payload.mainText}\n[${payload.sourceLabel}]${
            includeSubtitle && payload.subtitleOrTafsir ? `\n\n• ${payload.subtitleOrTafsir}` : ''
          }\n\nعبر تطبيق أثر | ATHAR`,
          files: [file]
        };

        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share(shareData);
          setStatusMessage('تمت مشاركة البطاقة المصورة بنجاح ✓');
          setTimeout(() => setStatusMessage(null), 3500);
          setIsExporting(false);
          return;
        } else {
          await navigator.share({
            title: payload.title,
            text: shareData.text
          });
          setStatusMessage('تمت المشاركة بنجاح ✓');
          setTimeout(() => setStatusMessage(null), 3500);
          setIsExporting(false);
          return;
        }
      }

      // Fallback: download the image directly so the user has the PNG file ready
      await handleDownloadCard();
    } catch {
      // User cancelled share sheet or fallback
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none text-right">
      <div className="bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col text-white">
        {/* Header */}
        <div className="p-4 border-b border-[#C8A24A]/25 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AtharBrandLogo size="sm" />
            <div>
              <h2 className="text-sm font-extrabold text-[#F3E5AB]">استوديو البطاقات الدعوية المصورة</h2>
              <p className="text-[10px] text-[#C4B998]">تصميم ومشاركة الآية أو الحديث أو الذكر كبطاقة ملكية عالية الجودة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18150E] hover:bg-[#241F14] text-[#C4B998] hover:text-white border border-[#C8A24A]/35 transition-colors"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Quick Preset Switcher if opened from the general studio card */}
          {!initialPayload && (
            <div>
              <label className="text-[11px] text-[#C4B998] block mb-1.5 font-extrabold">اختر نوع المحتوى للبطاقة:</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#14120D] rounded-2xl border border-[#C8A24A]/30 text-xs">
                {[
                  { idx: 0, label: 'آية قرآنية', icon: BookOpen },
                  { idx: 1, label: 'حديث شريف', icon: Sparkles },
                  { idx: 2, label: 'ذكر ودعاء', icon: Heart },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = payload.title === DEFAULT_PRESETS[tab.idx].title;
                  return (
                    <button
                      key={tab.idx}
                      onClick={() => setPayload(DEFAULT_PRESETS[tab.idx])}
                      className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 font-extrabold transition-all ${
                        active
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] shadow'
                          : 'text-[#C4B998] hover:text-white'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live High-Resolution Canvas Preview */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-[#C8A24A]/55 shadow-[0_12px_35px_rgba(0,0,0,0.9)] bg-[#080705] aspect-square w-full max-w-[340px] mx-auto">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block"
            />
          </div>

          {/* Background Theme Selector */}
          <div className="bg-[#12100C] border border-[#C8A24A]/30 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F3E5AB] font-extrabold">خلفية البطاقة الإسلامية الملكية:</span>
              <label className="flex items-center gap-1.5 text-[11px] text-[#C4B998] hover:text-white cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={includeSubtitle}
                  onChange={(e) => setIncludeSubtitle(e.target.checked)}
                  className="accent-[#C8A24A] rounded"
                />
                <span>إظهار التفسير / المعنى المختصر</span>
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              {CARD_THEMES.map((theme) => {
                const isSelected = selectedTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`relative overflow-hidden rounded-xl border p-2 text-center transition-all ${
                      isSelected
                        ? 'border-[#E6C66E] ring-1 ring-[#E6C66E]/50 text-[#F3E5AB] font-extrabold bg-[#221D12]'
                        : 'border-[#C8A24A]/25 bg-[#0B0A08] text-[#C4B998] hover:border-[#C8A24A]/55 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] block truncate">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Feedback Toast */}
          {statusMessage && (
            <div className="p-2.5 bg-[#1D1910] border border-[#E6C66E]/50 rounded-xl flex items-center gap-2 text-xs text-[#F3E5AB] font-bold">
              <Check size={14} className="text-[#E6C66E] shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons: Share Image or Download PNG */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleShareCard}
              disabled={isExporting}
              className="py-3 px-4 rounded-2xl bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#A67C1E] hover:brightness-110 text-[#070707] border border-[#F3E5AB]/60 font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(200,162,74,0.35)] transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 size={15} />
              <span>مشاركة البطاقة المصورة</span>
            </button>

            <button
              onClick={handleDownloadCard}
              disabled={isExporting}
              className="py-3 px-4 rounded-2xl bg-[#16140F] hover:bg-[#211D15] text-[#F3E5AB] border border-[#C8A24A]/45 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={15} />
              <span>حفظ الصورة في الجهاز</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
