import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move, Sparkles } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface CircularPhotoCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onApplyCrop: (croppedBlob: Blob, previewUrl: string) => void;
}

export const CircularPhotoCropModal: React.FC<CircularPhotoCropModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onApplyCrop,
}) => {
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportSize = 260; // 260x260 preview viewport

  // Load image when file changes
  useEffect(() => {
    if (!imageFile || !isOpen) {
      setImgElement(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImgElement(img);
        setScale(1);
        setPanX(0);
        setPanY(0);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile, isOpen]);

  // Render preview canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewportSize;
    canvas.height = viewportSize;

    ctx.clearRect(0, 0, viewportSize, viewportSize);

    // Save state for circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(viewportSize / 2, viewportSize / 2, viewportSize / 2 - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Dark background for empty canvas areas
    ctx.fillStyle = '#080807';
    ctx.fillRect(0, 0, viewportSize, viewportSize);

    // Calculate dimensions to fit base image inside viewport
    const imgAspect = imgElement.width / imgElement.height;
    let baseWidth = viewportSize;
    let baseHeight = viewportSize;

    if (imgAspect > 1) {
      // Wider than tall
      baseHeight = viewportSize;
      baseWidth = viewportSize * imgAspect;
    } else {
      // Taller than wide
      baseWidth = viewportSize;
      baseHeight = viewportSize / imgAspect;
    }

    const drawWidth = baseWidth * scale;
    const drawHeight = baseHeight * scale;

    const centerX = viewportSize / 2 + panX;
    const centerY = viewportSize / 2 + panY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      imgElement,
      centerX - drawWidth / 2,
      centerY - drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  }, [imgElement, scale, panX, panY]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Pointer / Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: panX, y: panY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPanX(panStart.x + deltaX);
    setPanY(panStart.y + deltaY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleReset = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {}
  };

  const handleApply = async () => {
    if (!imgElement) return;
    setIsExporting(true);

    try {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}

      // High-resolution 512x512 final render
      const exportSize = 512;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('تعذر إنشاء مساحة العمل لمعالجة الصورة.');
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#080807';
      ctx.fillRect(0, 0, exportSize, exportSize);

      const ratio = exportSize / viewportSize;
      const imgAspect = imgElement.width / imgElement.height;
      let baseWidth = viewportSize;
      let baseHeight = viewportSize;

      if (imgAspect > 1) {
        baseHeight = viewportSize;
        baseWidth = viewportSize * imgAspect;
      } else {
        baseWidth = viewportSize;
        baseHeight = viewportSize / imgAspect;
      }

      const drawWidth = baseWidth * scale * ratio;
      const drawHeight = baseHeight * scale * ratio;
      const centerX = (viewportSize / 2 + panX) * ratio;
      const centerY = (viewportSize / 2 + panY) * ratio;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        imgElement,
        centerX - drawWidth / 2,
        centerY - drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.restore();

      // Export to WebP with JPEG fallback
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsExporting(false);
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          onApplyCrop(blob, previewUrl);
          setIsExporting(false);
          onClose();
        },
        'image/webp',
        0.92
      );
    } catch (err) {
      console.error('Failed to export cropped image:', err);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-sm bg-[#0E0C09] border border-[#D9AE48]/35 rounded-3xl shadow-[0_12px_44px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2210] bg-[#14120B]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#D9AE48]/20 flex items-center justify-center border border-[#D9AE48]/40">
              <Sparkles size={14} className="text-[#FFE6A0]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F7F2E7]">قص وتعديل الصورة</h3>
              <p className="text-[10px] text-[#A69E8D]">اسحب الصورة لتوسيطها أو استخدم شريط التكبير</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A69E8D] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="إلغاء"
          >
            <X size={17} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center">
          <div
            className="relative w-[260px] h-[260px] rounded-full p-[3px] bg-gradient-to-tr from-[#9D7620] via-[#FFE6A0] to-[#D9AE48] shadow-[0_0_24px_rgba(217,174,72,0.35)] cursor-grab active:cursor-grabbing touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full rounded-full block pointer-events-none"
            />
            {/* Subtle center guide mark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
              <div className="w-8 h-8 rounded-full border border-dashed border-[#FFE6A0]" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#B5AD9B]">
            <Move size={12} className="text-[#D9AE48]" />
            <span>اسحب الصورة بالإصبع لتحريكها وتوسيطها</span>
          </div>

          {/* Zoom Slider */}
          <div className="w-full mt-4 bg-[#14120B] border border-[#D9AE48]/20 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F7F2E7] flex items-center gap-1.5">
                <ZoomIn size={14} className="text-[#D9AE48]" />
                مستوى التكبير
              </span>
              <span className="font-mono text-[#FFE6A0] font-bold text-[11px]">
                {scale.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut size={14} className="text-[#A69E8D] shrink-0" />
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-[#D9AE48] bg-[#2A2210] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn size={14} className="text-[#A69E8D] shrink-0" />
            </div>
          </div>

          {/* Pan Adjustment Sliders */}
          <div className="w-full mt-2 grid grid-cols-2 gap-2">
            <div className="bg-[#14120B] border border-[#D9AE48]/15 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#B5AD9B] mb-1">
                <span>أفقي (X)</span>
                <span className="font-mono text-[10px] text-[#FFE6A0]">{Math.round(panX)}px</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="2"
                value={panX}
                onChange={(e) => setPanX(parseInt(e.target.value, 10))}
                className="w-full accent-[#D9AE48] bg-[#2A2210] h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="bg-[#14120B] border border-[#D9AE48]/15 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#B5AD9B] mb-1">
                <span>عمودي (Y)</span>
                <span className="font-mono text-[10px] text-[#FFE6A0]">{Math.round(panY)}px</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="2"
                value={panY}
                onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                className="w-full accent-[#D9AE48] bg-[#2A2210] h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#2A2210] bg-[#14120B] flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#B5AD9B] hover:text-white bg-[#1A160F] border border-[#D9AE48]/20 active:scale-95 transition-all"
            title="إعادة التعيين إلى الوضع الافتراضي"
          >
            <RotateCcw size={13} />
            <span>إعادة ضبط</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#A69E8D] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-tr from-[#9D7620] via-[#D9AE48] to-[#FFE6A0] text-[#080807] shadow-[0_2px_12px_rgba(217,174,72,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isExporting ? 'جاري القص...' : 'تطبيق القص'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
