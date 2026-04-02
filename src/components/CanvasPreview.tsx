import { useEffect, useRef } from 'react';

interface CanvasPreviewProps {
  backgroundImage: HTMLImageElement | null;
  pdfPageImage: HTMLImageElement | null;
  offsetX: number;
  offsetY: number;
  canvasWidthMM: number;
  canvasHeightMM: number;
  onCompositeReady?: (canvas: HTMLCanvasElement) => void;
}

export default function CanvasPreview({
  backgroundImage,
  pdfPageImage,
  offsetX,
  offsetY,
  canvasWidthMM,
  canvasHeightMM,
  onCompositeReady,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const previewW = canvas.offsetWidth || 800;
    const scale = previewW / canvasWidthMM;
    const previewH = Math.round(canvasHeightMM * scale);
    canvas.width = previewW;
    canvas.height = previewH;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, previewW, previewH);

    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, previewW, previewH);

    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, previewW, previewH);
    }

    if (pdfPageImage) {
      const pdfHalfW = Math.round((canvasWidthMM / 2) * scale);
      const imgNatW = pdfPageImage.naturalWidth || pdfPageImage.width;
      const imgNatH = pdfPageImage.naturalHeight || pdfPageImage.height;
      const imgAspect = imgNatW / imgNatH;
      let drawW = pdfHalfW;
      let drawH = drawW / imgAspect;
      if (drawH > previewH) {
        drawH = previewH;
        drawW = drawH * imgAspect;
      }
      const pdfX = Math.round((canvasWidthMM / 2) * scale) + Math.round(offsetX * scale);
      const pdfY = Math.round(offsetY * scale);
      ctx.drawImage(pdfPageImage, pdfX, pdfY, drawW, drawH);
    }

    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(previewW / 2, 0);
    ctx.lineTo(previewW / 2, previewH);
    ctx.stroke();
    ctx.setLineDash([]);

    if (onCompositeReady) onCompositeReady(canvas);
  }, [backgroundImage, pdfPageImage, offsetX, offsetY, canvasWidthMM, canvasHeightMM, onCompositeReady]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-slate-200 shadow-sm"
      style={{ aspectRatio: `${canvasWidthMM}/${canvasHeightMM}`, display: 'block' }}
    />
  );
}
