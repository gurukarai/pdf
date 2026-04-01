import { useEffect, useRef } from 'react';

interface CanvasPreviewProps {
  backgroundImage: HTMLImageElement | null;
  pdfPageImage: HTMLImageElement | null;
  offsetX: number;
  offsetY: number;
  onCompositeReady?: (canvas: HTMLCanvasElement) => void;
}

const CANVAS_W_MM = 297;
const CANVAS_H_MM = 210;
const PDF_HALF_W_MM = 148.5;

export default function CanvasPreview({
  backgroundImage,
  pdfPageImage,
  offsetX,
  offsetY,
  onCompositeReady,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const previewW = canvas.offsetWidth || 800;
    const scale = previewW / CANVAS_W_MM;
    const previewH = Math.round(CANVAS_H_MM * scale);
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
      const pdfHalfW = Math.round(PDF_HALF_W_MM * scale);
      const pdfH = previewH;
      const pdfX = Math.round((CANVAS_W_MM / 2) * scale) + Math.round(offsetX * scale);
      const pdfY = Math.round(offsetY * scale);
      ctx.drawImage(pdfPageImage, pdfX, pdfY, pdfHalfW, pdfH);
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
  }, [backgroundImage, pdfPageImage, offsetX, offsetY, onCompositeReady]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-slate-200 shadow-sm"
      style={{ aspectRatio: `${CANVAS_W_MM}/${CANVAS_H_MM}`, display: 'block' }}
    />
  );
}

export { CANVAS_W_MM, CANVAS_H_MM, PDF_HALF_W_MM };
