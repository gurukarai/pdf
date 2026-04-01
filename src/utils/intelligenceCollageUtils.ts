import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { IntelligenceCollageSettings } from '../types';

export interface ParsedImage {
  file: File;
  width: number;
  height: number;
  unit: 'in' | 'mm' | 'cm';
  originalName: string;
  img?: HTMLImageElement;
}

interface PlacedImage extends ParsedImage {
  x: number;
  y: number;
  rotated: boolean;
  actualWidth: number;
  actualHeight: number;
}

interface Shelf {
  y: number;
  height: number;
  nextX: number;
}

function convertToInches(value: number, unit: 'in' | 'mm' | 'cm'): number {
  switch (unit) {
    case 'mm': return value / 25.4;
    case 'cm': return value / 2.54;
    default: return value;
  }
}

export function parseDimensionsFromFilename(filename: string): { width: number; height: number; unit: 'in' | 'mm' | 'cm' } | null {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  const patterns: [RegExp, 'in' | 'mm' | 'cm'][] = [
    [/(\d+(?:\.\d+)?)\s*(?:in|inch|inches?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:in|inch|inches?)/i, 'in'],
    [/(\d+(?:\.\d+)?)\s*(?:mm|millimeters?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:mm|millimeters?)/i, 'mm'],
    [/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/i, 'cm'],
    [/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:in|inch|inches?)/i, 'in'],
    [/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:mm|millimeters?)/i, 'mm'],
    [/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/i, 'cm'],
  ];

  for (const [pattern, unit] of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      const w = parseFloat(match[1]);
      const h = parseFloat(match[2]);
      if (w > 0 && h > 0) return { width: w, height: h, unit };
    }
  }

  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function packOnePage(
  images: ParsedImage[],
  availableWidth: number,
  availableHeight: number,
  spacing: number,
  allowRotation: boolean
): { placed: PlacedImage[]; remaining: ParsedImage[] } {
  const placed: PlacedImage[] = [];
  const remaining: ParsedImage[] = [];
  const shelves: Shelf[] = [];

  const tryFitInShelves = (img: ParsedImage, iw: number, ih: number, rotated: boolean): boolean => {
    for (const shelf of shelves) {
      const xGap = shelf.nextX > 0 ? spacing : 0;
      const spaceLeft = availableWidth - shelf.nextX - xGap;

      if (iw <= spaceLeft + 0.0001 && ih <= shelf.height + 0.0001) {
        placed.push({
          ...img,
          x: shelf.nextX + xGap,
          y: shelf.y,
          rotated,
          actualWidth: iw,
          actualHeight: ih,
        });
        shelf.nextX += iw + xGap;
        return true;
      }
    }
    return false;
  };

  const tryOpenNewShelf = (img: ParsedImage, iw: number, ih: number, rotated: boolean): boolean => {
    const lastShelf = shelves[shelves.length - 1];
    const shelfY = lastShelf ? lastShelf.y + lastShelf.height + spacing : 0;

    if (iw <= availableWidth + 0.0001 && shelfY + ih <= availableHeight + 0.0001) {
      shelves.push({ y: shelfY, height: ih, nextX: iw });
      placed.push({ ...img, x: 0, y: shelfY, rotated, actualWidth: iw, actualHeight: ih });
      return true;
    }
    return false;
  };

  for (const img of images) {
    const w = img.width;
    const h = img.height;

    let placed_flag =
      tryFitInShelves(img, w, h, false) ||
      (allowRotation && tryFitInShelves(img, h, w, true)) ||
      tryOpenNewShelf(img, w, h, false) ||
      (allowRotation && tryOpenNewShelf(img, h, w, true));

    if (!placed_flag) {
      remaining.push(img);
    }
  }

  return { placed, remaining };
}

function packImagesMultiPage(
  images: ParsedImage[],
  availableWidth: number,
  availableHeight: number,
  spacing: number,
  allowRotation: boolean
): PlacedImage[][] {
  const pages: PlacedImage[][] = [];
  let remaining = [...images].sort(
    (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)
  );

  let safety = 0;
  while (remaining.length > 0 && safety < 200) {
    safety++;
    const result = packOnePage(remaining, availableWidth, availableHeight, spacing, allowRotation);

    if (result.placed.length === 0) {
      remaining = remaining.slice(1);
    } else {
      pages.push(result.placed);
      remaining = result.remaining;
    }
  }

  return pages;
}

function getPaperDimensions(settings: IntelligenceCollageSettings): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    '13x19': { width: 13, height: 19 },
    '12x18': { width: 12, height: 18 },
    'a3': { width: 11.693, height: 16.535 },
    'a4': { width: 8.268, height: 11.693 },
    'letter': { width: 8.5, height: 11 },
    'legal': { width: 8.5, height: 14 },
    'tabloid': { width: 11, height: 17 },
  };

  if (settings.paperSize === 'custom') {
    const u = settings.unit as 'in' | 'mm' | 'cm';
    return {
      width: convertToInches(settings.customWidth || 13, u),
      height: convertToInches(settings.customHeight || 19, u),
    };
  }

  return sizes[settings.paperSize] || sizes['13x19'];
}

function createCollageCanvas(
  placedImages: PlacedImage[],
  paperWidth: number,
  paperHeight: number,
  settings: IntelligenceCollageSettings,
  dpi = 300
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(paperWidth * dpi);
  canvas.height = Math.round(paperHeight * dpi);

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const u = settings.unit as 'in' | 'mm' | 'cm';
  const marginTop = convertToInches(settings.marginTop, u);
  const marginLeft = convertToInches(settings.marginLeft, u);

  for (const img of placedImages) {
    if (!img.img) continue;

    const px = Math.round((marginLeft + img.x) * dpi);
    const py = Math.round((marginTop + img.y) * dpi);
    const pw = Math.round(img.actualWidth * dpi);
    const ph = Math.round(img.actualHeight * dpi);

    ctx.save();
    if (img.rotated) {
      ctx.translate(px + pw, py);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img.img, 0, 0, ph, pw);
    } else {
      ctx.drawImage(img.img, px, py, pw, ph);
    }
    ctx.restore();
  }

  return canvas;
}

export async function processIntelligenceCollage(
  imageFiles: File[],
  settings: IntelligenceCollageSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress('Parsing dimensions from filenames...');

  const parsedImages: ParsedImage[] = [];
  const failedFiles: string[] = [];

  for (const file of imageFiles) {
    const dims = parseDimensionsFromFilename(file.name);
    if (dims) {
      const wIn = convertToInches(dims.width, dims.unit);
      const hIn = convertToInches(dims.height, dims.unit);
      parsedImages.push({ file, width: wIn, height: hIn, unit: dims.unit, originalName: file.name });
    } else {
      failedFiles.push(file.name);
    }
  }

  if (parsedImages.length === 0) {
    throw new Error(
      'No valid dimensions found in filenames. Use formats like "4inx6in-photo.jpg", "30mmx60mm-card.jpg", or "10cmx15cm.jpg".'
    );
  }

  if (failedFiles.length > 0) {
    const preview = failedFiles.slice(0, 3).join(', ');
    onProgress(`Skipping ${failedFiles.length} file(s) without dimensions: ${preview}${failedFiles.length > 3 ? '…' : ''}`);
  }

  onProgress(`Loading ${parsedImages.length} image(s)...`);
  for (let i = 0; i < parsedImages.length; i++) {
    onProgress(`Loading image ${i + 1} of ${parsedImages.length}...`);
    parsedImages[i].img = await loadImage(parsedImages[i].file);
  }

  const paper = getPaperDimensions(settings);
  const u = settings.unit as 'in' | 'mm' | 'cm';
  const marginTop = convertToInches(settings.marginTop, u);
  const marginBottom = convertToInches(settings.marginBottom, u);
  const marginLeft = convertToInches(settings.marginLeft, u);
  const marginRight = convertToInches(settings.marginRight, u);
  const spacing = convertToInches(settings.spacing, u);

  const availW = paper.width - marginLeft - marginRight;
  const availH = paper.height - marginTop - marginBottom;

  if (availW <= 0 || availH <= 0) {
    throw new Error('Margins are too large for the selected paper size. Please reduce margins.');
  }

  onProgress(`Packing ${parsedImages.length} image(s) on ${paper.width.toFixed(2)}" × ${paper.height.toFixed(2)}" paper...`);

  const pages = packImagesMultiPage(parsedImages, availW, availH, spacing, settings.allowRotation);

  if (pages.length === 0) {
    throw new Error('No images could fit on the paper. Try a larger paper size, smaller margins, or enable rotation.');
  }

  const totalPlaced = pages.reduce((sum, p) => sum + p.length, 0);
  onProgress(
    `Packed ${totalPlaced} of ${parsedImages.length} image(s) across ${pages.length} page(s). Rendering...`
  );

  if (settings.outputFormat === 'pdf') {
    const pdf = new jsPDF({
      orientation: paper.width > paper.height ? 'landscape' : 'portrait',
      unit: 'in',
      format: [paper.width, paper.height],
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      onProgress(`Rendering page ${i + 1} of ${pages.length}...`);
      const canvas = createCollageCanvas(pages[i], paper.width, paper.height, settings);
      const data = canvas.toDataURL('image/jpeg', settings.quality / 100);
      pdf.addImage(data, 'JPEG', 0, 0, paper.width, paper.height);
    }

    return {
      blob: pdf.output('blob'),
      filename: `intelligence-collage-${pages.length}p.pdf`,
    };
  } else {
    const zip = new JSZip();
    for (let i = 0; i < pages.length; i++) {
      onProgress(`Rendering page ${i + 1} of ${pages.length}...`);
      const canvas = createCollageCanvas(pages[i], paper.width, paper.height, settings);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', settings.quality / 100);
      });
      zip.file(`collage-page-${String(i + 1).padStart(2, '0')}.jpg`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      blob: zipBlob,
      filename: `intelligence-collage-${pages.length}p.zip`,
    };
  }
}
