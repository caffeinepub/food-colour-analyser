import { Button } from "@/components/ui/button";
import { Check, Crop, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CropModalProps {
  imageUrl: string;
  open: boolean;
  onConfirm: (croppedUrl: string) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Canvas-space coordinates for the image
interface ImageLayout {
  offsetX: number;
  offsetY: number;
  displayW: number;
  displayH: number;
  scaleX: number; // natural / display
  scaleY: number;
  naturalW: number;
  naturalH: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function CropModal({
  imageUrl,
  open,
  onConfirm,
  onCancel,
}: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const layoutRef = useRef<ImageLayout | null>(null);

  // selection in canvas coordinates (relative to canvas element, not image)
  const [selection, setSelection] = useState<Rect | null>(null);
  const selectionRef = useRef<Rect | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number>(0);

  // Keep selectionRef in sync for draw loop
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Load image and render to canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !layoutRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { offsetX, offsetY, displayW, displayH } = layoutRef.current;
    const sel = selectionRef.current;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(imgRef.current, offsetX, offsetY, displayW, displayH);

    if (sel && sel.w !== 0 && sel.h !== 0) {
      const sx = Math.min(sel.x, sel.x + sel.w);
      const sy = Math.min(sel.y, sel.y + sel.h);
      const sw = Math.abs(sel.w);
      const sh = Math.abs(sel.h);

      // Dark overlay
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear selection cutout
      ctx.clearRect(sx, sy, sw, sh);

      // Re-draw image in cutout (so it shows through)
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.drawImage(imgRef.current, offsetX, offsetY, displayW, displayH);
      ctx.restore();

      // Selection border
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);

      // Corner handles
      const handleSize = 12;
      const corners = [
        [sx, sy],
        [sx + sw - handleSize, sy],
        [sx, sy + sh - handleSize],
        [sx + sw - handleSize, sy + sh - handleSize],
      ];
      ctx.fillStyle = "#ffffff";
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx, cy, handleSize, handleSize);
      }

      // Rule-of-thirds grid inside selection
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + (sw / 3) * i, sy);
        ctx.lineTo(sx + (sw / 3) * i, sy + sh);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, sy + (sh / 3) * i);
        ctx.lineTo(sx + sw, sy + (sh / 3) * i);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, []);

  // Setup canvas size and load image
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    canvas.width = containerW;
    canvas.height = containerH;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;

      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const canvasAspect = containerW / containerH;
      const imgAspect = naturalW / naturalH;

      let displayW: number;
      let displayH: number;

      if (imgAspect > canvasAspect) {
        displayW = containerW;
        displayH = containerW / imgAspect;
      } else {
        displayH = containerH;
        displayW = containerH * imgAspect;
      }

      const offsetX = (containerW - displayW) / 2;
      const offsetY = (containerH - displayH) / 2;

      layoutRef.current = {
        offsetX,
        offsetY,
        displayW,
        displayH,
        scaleX: naturalW / displayW,
        scaleY: naturalH / displayH,
        naturalW,
        naturalH,
      };

      setSelection(null);
      selectionRef.current = null;
      renderCanvas();
    };
    img.src = imageUrl;
  }, [open, imageUrl, renderCanvas]);

  // Redraw when selection changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection triggers a redraw via selectionRef
  useEffect(() => {
    renderCanvas();
  }, [selection, renderCanvas]);

  // Get canvas-relative pointer coords
  const getPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Clamp position to image bounds
  const clampToImage = (x: number, y: number) => {
    const layout = layoutRef.current;
    if (!layout) return { x, y };
    return {
      x: clamp(x, layout.offsetX, layout.offsetX + layout.displayW),
      y: clamp(y, layout.offsetY, layout.offsetY + layout.displayH),
    };
  };

  const handlePointerDown = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    const pos = getPos(e);
    const clamped = clampToImage(pos.x, pos.y);
    isDragging.current = true;
    dragStart.current = clamped;
    setSelection({ x: clamped.x, y: clamped.y, w: 0, h: 0 });
  };

  const handlePointerMove = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDragging.current || !dragStart.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const clamped = clampToImage(pos.x, pos.y);
    const start = dragStart.current;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setSelection({
        x: start.x,
        y: start.y,
        w: clamped.x - start.x,
        h: clamped.y - start.y,
      });
    });
  };

  const handlePointerUp = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    isDragging.current = false;
    dragStart.current = null;
  };

  const handleConfirm = () => {
    const layout = layoutRef.current;
    const img = imgRef.current;
    if (!img || !layout) return;

    let cropX: number;
    let cropY: number;
    let cropW: number;
    let cropH: number;

    if (selection && Math.abs(selection.w) > 4 && Math.abs(selection.h) > 4) {
      // Map canvas coords → image natural coords
      const sx = Math.min(selection.x, selection.x + selection.w);
      const sy = Math.min(selection.y, selection.y + selection.h);
      const sw = Math.abs(selection.w);
      const sh = Math.abs(selection.h);

      cropX = (sx - layout.offsetX) * layout.scaleX;
      cropY = (sy - layout.offsetY) * layout.scaleY;
      cropW = sw * layout.scaleX;
      cropH = sh * layout.scaleY;

      // Clamp to natural dimensions
      cropX = clamp(cropX, 0, layout.naturalW);
      cropY = clamp(cropY, 0, layout.naturalH);
      cropW = clamp(cropW, 1, layout.naturalW - cropX);
      cropH = clamp(cropH, 1, layout.naturalH - cropY);
    } else {
      // Full image
      cropX = 0;
      cropY = 0;
      cropW = layout.naturalW;
      cropH = layout.naturalH;
    }

    // Draw cropped area to offscreen canvas at native resolution
    const offscreen = document.createElement("canvas");
    offscreen.width = cropW;
    offscreen.height = cropH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dataUrl = offscreen.toDataURL("image/jpeg", 0.95);
    onConfirm(dataUrl);
  };

  const hasSelection =
    selection !== null &&
    Math.abs(selection.w) > 4 &&
    Math.abs(selection.h) > 4;

  if (!open) return null;

  return (
    <div
      data-ocid="crop.dialog"
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Crop size={16} className="text-white/70" />
          <span className="text-sm font-semibold text-white">Crop Image</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Close crop modal"
        >
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 bg-black/60 shrink-0">
        <p className="text-xs text-white/60 text-center">
          Drag to select the region you want to analyse
        </p>
      </div>

      {/* Canvas area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-4 py-4 bg-black/80 border-t border-white/10 shrink-0">
        <Button
          data-ocid="crop.cancel_button"
          type="button"
          variant="outline"
          className="flex-1 h-12 border-white/20 text-white bg-white/5 hover:bg-white/15 hover:text-white"
          onClick={onCancel}
        >
          <X size={16} className="mr-2" />
          Cancel
        </Button>
        <Button
          data-ocid="crop.confirm_button"
          type="button"
          className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          onClick={handleConfirm}
        >
          <Check size={16} className="mr-2" />
          {hasSelection ? "Crop & Analyse" : "Use Full Image"}
        </Button>
      </div>
    </div>
  );
}
