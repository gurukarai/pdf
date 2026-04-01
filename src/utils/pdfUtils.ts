import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { DPI, CARD_SHEET_PAPER_SIZES, PDF_TOOL_PAPER_SIZES_POINTS, CM_TO_POINTS, MM_TO_POINTS } from '../constants';
import { CardSheetSettings, PdfManipulationSettings, BookWrapperSettings } from '../types';

const { getDocument } = pdfjsLib;

export async function countPdfPages(
  files: File[],
  onProgress: (message: string) => void
): Promise<Array<{filename: string, pageCount: number}>> {
  const results: Array<{filename: string, pageCount: number}> = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(`Counting pages in ${file.name} (${i + 1}/${files.length})...`);
    
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const pageCount = pdf.getPageCount();
      
      results.push({
        filename: file.name,
        pageCount: pageCount
      });
    } catch (error) {
      console.error(`Error counting pages in ${file.name}:`, error);
      results.push({
        filename: file.name,
        pageCount: 0
      });
    }
  }
  
  return results;
}

export function convertToMm(value: number, unit: 'mm' | 'cm' | 'in'): number {
  switch (unit) {
    case 'cm':
      return value * 10;
    case 'in':
      return value * 25.4;
    default:
      return value;
  }
}

export function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * DPI);
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image loading failed for ${file.name}`));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error(`FileReader failed for ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function fileToHTMLImage(file: File): Promise<HTMLImageElement> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 300 / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  return loadImage(file);
}

export function rotateImage(img: HTMLImageElement, rotationAngle: number): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    if (rotationAngle === 0) {
      resolve(img);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // For 90° and 270° rotations, swap width and height
    if (rotationAngle === 90 || rotationAngle === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationAngle * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const rotatedImg = new Image();
    rotatedImg.onload = () => resolve(rotatedImg);
    rotatedImg.src = canvas.toDataURL();
  });
}

export function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const markLenPx = mmToPx(5);
  const offsetPx = mmToPx(3);

  // Save current context state
  ctx.save();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  // Helper function to draw a line only if it's within canvas bounds
  const drawLineIfVisible = (x1: number, y1: number, x2: number, y2: number) => {
    // Check if any part of the line is within canvas bounds
    if ((x1 >= 0 || x2 >= 0) && (x1 <= canvasWidth || x2 <= canvasWidth) &&
        (y1 >= 0 || y2 >= 0) && (y1 <= canvasHeight || y2 <= canvasHeight)) {
      ctx.beginPath();
      ctx.moveTo(Math.max(0, Math.min(canvasWidth, x1)), Math.max(0, Math.min(canvasHeight, y1)));
      ctx.lineTo(Math.max(0, Math.min(canvasWidth, x2)), Math.max(0, Math.min(canvasHeight, y2)));
      ctx.stroke();
    }
  };

  // Top-left corner marks
  drawLineIfVisible(x - offsetPx, y, x - offsetPx - markLenPx, y);
  drawLineIfVisible(x, y - offsetPx, x, y - offsetPx - markLenPx);

  // Top-right corner marks
  drawLineIfVisible(x + w + offsetPx, y, x + w + offsetPx + markLenPx, y);
  drawLineIfVisible(x + w, y - offsetPx, x + w, y - offsetPx - markLenPx);

  // Bottom-left corner marks
  drawLineIfVisible(x - offsetPx, y + h, x - offsetPx - markLenPx, y + h);
  drawLineIfVisible(x, y + h + offsetPx, x, y + h + offsetPx + markLenPx);

  // Bottom-right corner marks
  drawLineIfVisible(x + w + offsetPx, y + h, x + w + offsetPx + markLenPx, y + h);
  drawLineIfVisible(x + w, y + h + offsetPx, x + w, y + h + offsetPx + markLenPx);

  // Restore context state
  ctx.restore();
}

export function drawCuttingOffsetGuides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  offsetPx: number
): void {
  if (offsetPx <= 0) return;

  const markLenPx = mmToPx(5);

  ctx.save();
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  // Top-left corner marks (inside)
  ctx.beginPath();
  ctx.moveTo(x + offsetPx, y + offsetPx + markLenPx);
  ctx.lineTo(x + offsetPx, y + offsetPx);
  ctx.lineTo(x + offsetPx + markLenPx, y + offsetPx);
  ctx.stroke();

  // Top-right corner marks (inside)
  ctx.beginPath();
  ctx.moveTo(x + w - offsetPx - markLenPx, y + offsetPx);
  ctx.lineTo(x + w - offsetPx, y + offsetPx);
  ctx.lineTo(x + w - offsetPx, y + offsetPx + markLenPx);
  ctx.stroke();

  // Bottom-left corner marks (inside)
  ctx.beginPath();
  ctx.moveTo(x + offsetPx, y + h - offsetPx - markLenPx);
  ctx.lineTo(x + offsetPx, y + h - offsetPx);
  ctx.lineTo(x + offsetPx + markLenPx, y + h - offsetPx);
  ctx.stroke();

  // Bottom-right corner marks (inside)
  ctx.beginPath();
  ctx.moveTo(x + w - offsetPx - markLenPx, y + h - offsetPx);
  ctx.lineTo(x + w - offsetPx, y + h - offsetPx);
  ctx.lineTo(x + w - offsetPx, y + h - offsetPx - markLenPx);
  ctx.stroke();

  ctx.restore();
}

export async function generateCardSheetPDF(
  imageFiles: File[],
  settings: CardSheetSettings,
  onProgress: (message: string) => void
): Promise<Blob> {
  const paperDimensions = CARD_SHEET_PAPER_SIZES[settings.paperType];
  const cardsPerSheet = settings.useMixedLayout
    ? (settings.cardsPerRow * settings.cardsPerColumn) + settings.mixedHorizontalCards
    : settings.cardsPerRow * settings.cardsPerColumn;

  // Convert all dimensions to mm
  const cardWidthMm = convertToMm(settings.cardWidth, settings.unit);
  const cardHeightMm = convertToMm(settings.cardHeight, settings.unit);
  const rowGapMm = convertToMm(settings.rowGap, settings.unit);
  const colGapMm = convertToMm(settings.colGap, settings.unit);
  const pageMarginMm = settings.pageMargin ?? 0;
  const singleMarginTopMm = convertToMm(settings.singleMarginTop, settings.unit);
  const singleMarginBottomMm = convertToMm(settings.singleMarginBottom, settings.unit);
  const singleMarginLeftMm = convertToMm(settings.singleMarginLeft, settings.unit);
  const singleMarginRightMm = convertToMm(settings.singleMarginRight, settings.unit);

  // Convert cutting offset to pixels based on unit
  const cuttingOffsetPx = settings.cuttingOffsetUnit === 'mm'
    ? mmToPx(settings.cuttingOffset)
    : settings.cuttingOffset;

  // Sort files naturally
  const sortedFiles = [...imageFiles].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  onProgress(`Loading ${sortedFiles.length} file(s)...`);
  const loadedImagesNested = await Promise.all(sortedFiles.map(async (file) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: HTMLImageElement[] = [];
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 300 / 72 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = dataUrl;
        });
        pages.push(img);
      }
      return pages;
    }
    return [await loadImage(file)];
  }));
  const loadedImages = loadedImagesNested.flat();

  // Rotate images if needed
  onProgress('Rotating images...');
  const rotatedImages = await Promise.all(
    loadedImages.map(img => rotateImage(img, settings.rotationAngle))
  );

  onProgress('Images processed. Generating PDF sheets...');

  // Handle front/back printing: fill page 1 with image 1, page 2 with image 2
  if (settings.frontBackPrinting && rotatedImages.length === 2) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperDimensions.width, paperDimensions.height]
    });

    const bleedPx = mmToPx(settings.bleed);
    const cardWidthPx = mmToPx(cardWidthMm) + (bleedPx * 2);
    const cardHeightPx = mmToPx(cardHeightMm) + (bleedPx * 2);
    const rowGapPx = mmToPx(rowGapMm);
    const colGapPx = mmToPx(colGapMm);
    const cuttingOffsetPxFB = settings.cuttingOffsetUnit === 'mm'
      ? mmToPx(settings.cuttingOffset)
      : settings.cuttingOffset;

    const renderSheet = (img: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      const pageWidthPx = mmToPx(paperDimensions.width);
      const pageHeightPx = mmToPx(paperDimensions.height);
      canvas.width = pageWidthPx;
      canvas.height = pageHeightPx;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pageMarginPx = mmToPx(pageMarginMm);
      const availableW = pageWidthPx - pageMarginPx * 2;
      const availableH = pageHeightPx - pageMarginPx * 2;
      const totalGridWidth = (cardWidthPx * settings.cardsPerRow) + (colGapPx * (settings.cardsPerRow > 1 ? settings.cardsPerRow - 1 : 0));
      const totalGridHeight = (cardHeightPx * settings.cardsPerColumn) + (rowGapPx * (settings.cardsPerColumn > 1 ? settings.cardsPerColumn - 1 : 0));
      const gridMarginX = pageMarginPx + (availableW - totalGridWidth) / 2;
      const gridMarginY = pageMarginPx + (availableH - totalGridHeight) / 2;

      for (let idx = 0; idx < cardsPerSheet; idx++) {
        const row = Math.floor(idx / settings.cardsPerRow);
        const col = idx % settings.cardsPerRow;
        const imageDrawX = gridMarginX + col * (cardWidthPx + colGapPx);
        const imageDrawY = gridMarginY + row * (cardHeightPx + rowGapPx);
        ctx.drawImage(img, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx);
        if (settings.includeCropMarks) {
          drawCropMarks(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, canvas.width, canvas.height);
        }
        if (settings.cuttingOffset > 0 && settings.bleed === 0) {
          drawCuttingOffsetGuides(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, cuttingOffsetPxFB);
        }
      }
      return canvas.toDataURL('image/jpeg', 0.95);
    };

    onProgress('Generating front page...');
    const frontData = renderSheet(rotatedImages[0]);
    doc.addImage(frontData, 'JPEG', 0, 0, paperDimensions.width, paperDimensions.height);

    onProgress('Generating back page...');
    doc.addPage();
    const backData = renderSheet(rotatedImages[1]);
    doc.addImage(backData, 'JPEG', 0, 0, paperDimensions.width, paperDimensions.height);

    onProgress('Front/back PDF ready.');
    return doc.output('blob');
  }

  // Handle clone and fill option for single image
  let imagesToProcess = rotatedImages;
  if (settings.cloneAndFill && rotatedImages.length === 1) {
    // Clone the single image to fill the grid
    const singleImage = rotatedImages[0];
    imagesToProcess = Array(cardsPerSheet).fill(singleImage);
    onProgress(`Cloning single image to fill ${cardsPerSheet} positions per sheet...`);
  }

  const pdfOptions: any = {
    orientation: 'portrait',
    unit: 'mm',
    format: [paperDimensions.width, paperDimensions.height]
  };
  const doc = new jsPDF(pdfOptions);
  let pageCount = 0;

  for (let i = 0; i < imagesToProcess.length; i += cardsPerSheet) {
    const imageBatch = imagesToProcess.slice(i, i + cardsPerSheet);
    if (imageBatch.length === 0) break;

    const canvas = document.createElement('canvas');
    const pageWidthPx = mmToPx(paperDimensions.width);
    const pageHeightPx = mmToPx(paperDimensions.height);
    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply bleed to card dimensions (convert bleed from mm to pixels)
    const bleedPx = mmToPx(settings.bleed);
    const cardWidthPx = mmToPx(cardWidthMm) + (bleedPx * 2);
    const cardHeightPx = mmToPx(cardHeightMm) + (bleedPx * 2);
    const rowGapPx = mmToPx(rowGapMm);
    const colGapPx = mmToPx(colGapMm);

    const pageMarginPx = mmToPx(pageMarginMm);

    if (settings.cardsPerRow === 1 && settings.cardsPerColumn === 1 && !settings.cloneAndFill) {
      // Single image placement (only when not cloning)
      const singleMarginTopPx = pageMarginPx + mmToPx(singleMarginTopMm);
      const singleMarginBottomPx = pageMarginPx + mmToPx(singleMarginBottomMm);
      const singleMarginLeftPx = pageMarginPx + mmToPx(singleMarginLeftMm);
      const singleMarginRightPx = pageMarginPx + mmToPx(singleMarginRightMm);

      const effectiveContentWidth = pageWidthPx - singleMarginLeftPx - singleMarginRightPx;
      const effectiveContentHeight = pageHeightPx - singleMarginTopPx - singleMarginBottomPx;

      let contentX: number, contentY: number;
      switch (settings.singleImagePosition) {
        case 'top-left':
          contentX = 0;
          contentY = 0;
          break;
        case 'top-center':
          contentX = (effectiveContentWidth - cardWidthPx) / 2;
          contentY = 0;
          break;
        case 'top-right':
          contentX = effectiveContentWidth - cardWidthPx;
          contentY = 0;
          break;
        case 'middle-left':
          contentX = 0;
          contentY = (effectiveContentHeight - cardHeightPx) / 2;
          break;
        case 'middle-center':
          contentX = (effectiveContentWidth - cardWidthPx) / 2;
          contentY = (effectiveContentHeight - cardHeightPx) / 2;
          break;
        case 'middle-right':
          contentX = effectiveContentWidth - cardWidthPx;
          contentY = (effectiveContentHeight - cardHeightPx) / 2;
          break;
        case 'bottom-left':
          contentX = 0;
          contentY = effectiveContentHeight - cardHeightPx;
          break;
        case 'bottom-center':
          contentX = (effectiveContentWidth - cardWidthPx) / 2;
          contentY = effectiveContentHeight - cardHeightPx;
          break;
        case 'bottom-right':
          contentX = effectiveContentWidth - cardWidthPx;
          contentY = effectiveContentHeight - cardHeightPx;
          break;
        default:
          contentX = (effectiveContentWidth - cardWidthPx) / 2;
          contentY = (effectiveContentHeight - cardHeightPx) / 2;
      }

      const imageDrawX = singleMarginLeftPx + contentX;
      const imageDrawY = singleMarginTopPx + contentY;

      imageBatch.forEach((img) => {
        ctx.drawImage(img, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx);
        if (settings.includeCropMarks) {
          drawCropMarks(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, canvas.width, canvas.height);
        }
        // Only draw cutting offset guides if bleed is not enabled
        if (settings.cuttingOffset > 0 && settings.bleed === 0) {
          drawCuttingOffsetGuides(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, cuttingOffsetPx);
        }
      });
    } else {
      // Multi-image grid placement (or single image with clone and fill)
      if (settings.useMixedLayout) {
        // Mixed layout: vertical cards in grid + horizontal cards at bottom
        const verticalCards = settings.cardsPerRow * settings.cardsPerColumn;

        // Calculate vertical section
        const verticalGridWidth = (cardWidthPx * settings.cardsPerRow) + (colGapPx * (settings.cardsPerRow > 1 ? settings.cardsPerRow - 1 : 0));
        const verticalGridHeight = (cardHeightPx * settings.cardsPerColumn) + (rowGapPx * (settings.cardsPerColumn > 1 ? settings.cardsPerColumn - 1 : 0));

        // Calculate horizontal section (cards rotated 90 degrees)
        const horizontalCardWidth = cardHeightPx; // swapped because rotated
        const horizontalCardHeight = cardWidthPx; // swapped because rotated
        const horizontalGridWidth = (horizontalCardWidth * settings.mixedHorizontalCards) + (colGapPx * (settings.mixedHorizontalCards > 1 ? settings.mixedHorizontalCards - 1 : 0));

        // Calculate total height and centering with page margin
        const availableW = pageWidthPx - pageMarginPx * 2;
        const availableH = pageHeightPx - pageMarginPx * 2;
        const totalHeight = verticalGridHeight + rowGapPx + horizontalCardHeight;
        const gridMarginY = pageMarginPx + (availableH - totalHeight) / 2;
        const verticalGridMarginX = pageMarginPx + (availableW - verticalGridWidth) / 2;
        const horizontalGridMarginX = pageMarginPx + (availableW - horizontalGridWidth) / 2;

        imageBatch.forEach((img, idx) => {
          if (idx < verticalCards) {
            // Draw vertical cards
            const row = Math.floor(idx / settings.cardsPerRow);
            const col = idx % settings.cardsPerRow;
            const imageDrawX = verticalGridMarginX + col * (cardWidthPx + colGapPx);
            const imageDrawY = gridMarginY + row * (cardHeightPx + rowGapPx);

            ctx.drawImage(img, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx);
            if (settings.includeCropMarks) {
              drawCropMarks(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, canvas.width, canvas.height);
            }
            if (settings.cuttingOffset > 0 && settings.bleed === 0) {
              drawCuttingOffsetGuides(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, cuttingOffsetPx);
            }
          } else {
            // Draw horizontal cards (rotated 90 degrees)
            const horizontalIdx = idx - verticalCards;
            const imageDrawX = horizontalGridMarginX + horizontalIdx * (horizontalCardWidth + colGapPx);
            const imageDrawY = gridMarginY + verticalGridHeight + rowGapPx;

            // Save context and rotate
            ctx.save();
            ctx.translate(imageDrawX + horizontalCardWidth / 2, imageDrawY + horizontalCardHeight / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -cardWidthPx / 2, -cardHeightPx / 2, cardWidthPx, cardHeightPx);
            ctx.restore();

            if (settings.includeCropMarks) {
              drawCropMarks(ctx, imageDrawX, imageDrawY, horizontalCardWidth, horizontalCardHeight, canvas.width, canvas.height);
            }
            if (settings.cuttingOffset > 0 && settings.bleed === 0) {
              drawCuttingOffsetGuides(ctx, imageDrawX, imageDrawY, horizontalCardWidth, horizontalCardHeight, cuttingOffsetPx);
            }
          }
        });
      } else {
        // Standard grid placement
        const availableW = pageWidthPx - pageMarginPx * 2;
        const availableH = pageHeightPx - pageMarginPx * 2;
        const totalGridWidth = (cardWidthPx * settings.cardsPerRow) + (colGapPx * (settings.cardsPerRow > 1 ? settings.cardsPerRow - 1 : 0));
        const totalGridHeight = (cardHeightPx * settings.cardsPerColumn) + (rowGapPx * (settings.cardsPerColumn > 1 ? settings.cardsPerColumn - 1 : 0));
        const gridMarginX = pageMarginPx + (availableW - totalGridWidth) / 2;
        const gridMarginY = pageMarginPx + (availableH - totalGridHeight) / 2;

        imageBatch.forEach((img, idx) => {
          const row = Math.floor(idx / settings.cardsPerRow);
          const col = idx % settings.cardsPerRow;
          const imageDrawX = gridMarginX + col * (cardWidthPx + colGapPx);
          const imageDrawY = gridMarginY + row * (cardHeightPx + rowGapPx);

          ctx.drawImage(img, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx);
          if (settings.includeCropMarks) {
            drawCropMarks(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, canvas.width, canvas.height);
          }
          // Only draw cutting offset guides if bleed is not enabled
          if (settings.cuttingOffset > 0 && settings.bleed === 0) {
            drawCuttingOffsetGuides(ctx, imageDrawX, imageDrawY, cardWidthPx, cardHeightPx, cuttingOffsetPx);
          }
        });
      }
    }

    if (pageCount > 0) doc.addPage();
    
    // Convert canvas to image with proper quality settings
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imageData, 'JPEG', 0, 0, paperDimensions.width, paperDimensions.height);
    pageCount++;
    
    if (settings.cloneAndFill && loadedImages.length === 1) {
      onProgress(`Generated sheet ${pageCount} with cloned images...`);
    } else {
      onProgress(`Generated sheet ${pageCount}...`);
    }
  }

  return doc.output('blob');
}

export function parsePageRanges(rangeStr: string, maxPage: number): number[] {
  const indices = new Set<number>();
  if (!rangeStr) return [];
  
  const parts = rangeStr.replace(/\s/g, '').split(',');
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start > 0 && start <= end && end <= maxPage) {
        for (let i = start; i <= end; i++) {
          indices.add(i - 1); // convert to 0-based
        }
      }
    } else {
      const pageNum = Number(part);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= maxPage) {
        indices.add(pageNum - 1); // convert to 0-based
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export async function processPdfManipulation(
  files: File[],
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  if (settings.mode === 'image-to-pdf') {
    return await processImageToPdf(files, settings, onProgress);
  } else if (settings.mode === 'pdf-to-image') {
    return await processPdfToImages(files[0], settings, onProgress);
  } else if (settings.mode === 'merge-pdf') {
    return await processMergePdfs(files, settings, onProgress);
  } else {
    const fileBuffer = await files[0].arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer);
    
    switch (settings.mode) {
      case 'split-pdf':
        return await processSplitPdf(sourcePdf, settings, onProgress);
      case 'add-margins':
        return await processAddMargins(sourcePdf, settings, onProgress);
      case 'add-page-numbers':
        return await processAddPageNumbers(sourcePdf, settings, onProgress);
      default:
        return await processImposition(sourcePdf, settings, onProgress);
    }
  }
}

async function processImageToPdf(
  files: File[],
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  if (files.length === 0) {
    throw new Error("Please select at least one image file.");
  }
  
  onProgress('Creating PDF document...');
  const finalPdf = await PDFDocument.create();
  
  // Get quality setting
  const getQuality = () => {
    switch (settings.imageSettings?.quality) {
      case 'high': return 0.95;
      case 'medium': return 0.80;
      case 'low': return 0.60;
      case 'custom': return (settings.imageSettings?.customQuality || 85) / 100;
      default: return 0.95;
    }
  };
  
  // Get page dimensions
  const getPageDimensions = (imageWidth: number, imageHeight: number) => {
    const pageSize = settings.imageSettings?.pageSize || 'auto';
    
    switch (pageSize) {
      case 'a4': return [210 * MM_TO_POINTS, 297 * MM_TO_POINTS];
      case 'letter': return [8.5 * 72, 11 * 72];
      case 'legal': return [8.5 * 72, 14 * 72];
      case 'a3': return [297 * MM_TO_POINTS, 420 * MM_TO_POINTS];
      default: // auto
        return [imageWidth, imageHeight];
    }
  };
  
  const quality = getQuality();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(`Processing ${file.name} (${i + 1}/${files.length})...`);
    
    try {
      // Load image
      const img = await loadImage(file);
      
      // Create canvas to convert image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      // Convert to blob with quality setting
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      });
      
      // Convert blob to array buffer
      const imageBytes = await imageBlob.arrayBuffer();
      
      // Embed image in PDF
      const embeddedImage = await finalPdf.embedJpg(imageBytes);
      const { width: originalWidth, height: originalHeight } = embeddedImage;
      
      // Get page dimensions
      const [pageWidth, pageHeight] = getPageDimensions(originalWidth, originalHeight);
      
      // Create new page
      const page = finalPdf.addPage([pageWidth, pageHeight]);
      
      // Calculate image placement based on fit setting
      const fit = settings.imageSettings?.fit || 'contain';
      let drawWidth = originalWidth;
      let drawHeight = originalHeight;
      let x = 0;
      let y = 0;
      
      if (settings.imageSettings?.pageSize !== 'auto') {
        switch (fit) {
          case 'contain':
            // Scale to fit within page while maintaining aspect ratio
            const scaleX = pageWidth / originalWidth;
            const scaleY = pageHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY);
            drawWidth = originalWidth * scale;
            drawHeight = originalHeight * scale;
            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
            break;
          case 'cover':
            // Scale to fill page while maintaining aspect ratio (may crop)
            const coverScaleX = pageWidth / originalWidth;
            const coverScaleY = pageHeight / originalHeight;
            const coverScale = Math.max(coverScaleX, coverScaleY);
            drawWidth = originalWidth * coverScale;
            drawHeight = originalHeight * coverScale;
            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
            break;
          case 'stretch':
            // Stretch to fill entire page
            drawWidth = pageWidth;
            drawHeight = pageHeight;
            x = 0;
            y = 0;
            break;
        }
      }
      
      // Draw the image
      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight
      });
      
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      onProgress(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  onProgress('Finalizing PDF...');
  const pdfBytes = await finalPdf.save();
  
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'images-to-pdf-output.pdf'
  };
}

export async function processPdfToImages(
  file: File,
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string; images?: Array<{pageNumber: number, dataUrl: string, blob: Blob}> }> {
  onProgress('Loading PDF...');
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  
  onProgress(`Converting ${numPages} pages to images...`);
  
  const zip = new JSZip();
  const format = settings.pdfToImageSettings?.format || 'png';
  const dpi = parseInt(settings.pdfToImageSettings?.dpi || '150');
  const quality = settings.pdfToImageSettings?.quality || 'high';
  
  // Calculate scale based on DPI (72 DPI is the base)
  const scale = dpi / 72;
  
  // Get JPEG quality value
  const getJpegQuality = () => {
    switch (quality) {
      case 'high': return 0.95;
      case 'medium': return 0.80;
      case 'low': return 0.60;
      default: return 0.95;
    }
  };
  
  const convertedImages: Array<{pageNumber: number, dataUrl: string, blob: Blob}> = [];
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress(`Processing page ${pageNum} of ${numPages}...`);
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const qualityValue = format === 'jpeg' ? getJpegQuality() : 1.0;
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, mimeType, qualityValue);
    });
    
    // Store for preview
    const dataUrl = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', format === 'jpeg' ? getJpegQuality() : 1.0);
    convertedImages.push({
      pageNumber: pageNum,
      dataUrl,
      blob
    });
    
    // Add to ZIP with proper filename
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `page-${pageNum.toString().padStart(3, '0')}.${extension}`;
    zip.file(filename, blob);
  }
  
  onProgress('Creating ZIP file...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  return {
    blob: zipBlob,
    filename: 'pdf-to-images.zip',
    images: convertedImages
  };
}

async function processMergePdfs(
  files: File[],
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  if (files.length < 2) {
    throw new Error("Please select at least two PDF files to merge.");
  }
  
  const finalPdf = await PDFDocument.create();
  const addBlankOnOdd = settings.mergeSettings?.addBlankOnOdd || false;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(`Processing ${file.name} (${i + 1}/${files.length})...`);
    
    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer);
    const pageCount = sourcePdf.getPageCount();
    
    const copiedPages = await finalPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach(page => finalPdf.addPage(page));

    if (addBlankOnOdd && pageCount % 2 !== 0) {
      const lastPage = finalPdf.getPage(finalPdf.getPageCount() - 1);
      const { width, height } = lastPage.getSize();
      finalPdf.addPage([width, height]);
    }
  }
  
  onProgress('Finalizing merged document...');
  const pdfBytes = await finalPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'merged-output.pdf'
  };
}

async function processSplitPdf(
  sourcePdf: PDFDocument,
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const splitMethod = settings.splitSettings?.method || 'range';
  const totalPages = sourcePdf.getPageCount();

  if (splitMethod === 'fixed') {
    const chunkSize = settings.splitSettings?.fixedPages || 1;
    if (chunkSize < 1) throw new Error("Invalid number of pages for splitting.");
    
    onProgress('Creating ZIP file...');
    const zip = new JSZip();
    
    for (let i = 0; i < totalPages; i += chunkSize) {
      const newPdf = await PDFDocument.create();
      const endPage = Math.min(i + chunkSize, totalPages);
      const pageIndicesToCopy = Array.from({ length: endPage - i }, (_, k) => i + k);
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndicesToCopy);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      zip.file(`split-part-${(i / chunkSize) + 1}.pdf`, pdfBytes);
    }
    
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return { blob: zipBlob, filename: 'split-output.zip' };
  }
  
  let pagesToExtract: number[] = [];
  if (splitMethod === 'range') {
    pagesToExtract = parsePageRanges(settings.splitSettings?.range || '', totalPages);
    if (pagesToExtract.length === 0) throw new Error("No valid pages selected in range.");
  } else if (splitMethod === 'odd') {
    pagesToExtract = sourcePdf.getPageIndices().filter(i => (i + 1) % 2 !== 0);
  } else if (splitMethod === 'even') {
    pagesToExtract = sourcePdf.getPageIndices().filter(i => (i + 1) % 2 === 0);
  }
  
  onProgress('Extracting pages...');
  const finalPdf = await PDFDocument.create();
  const copiedPages = await finalPdf.copyPages(sourcePdf, pagesToExtract);
  copiedPages.forEach(page => finalPdf.addPage(page));
  const pdfBytes = await finalPdf.save();
  
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${splitMethod}-split-output.pdf`
  };
}

async function processAddMargins(
  sourcePdf: PDFDocument,
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const finalPdf = await PDFDocument.create();
  const marginScope = settings.marginScope || 'all';
  const drawFrame = settings.drawFrame || false;
  
  const oddMargins = settings.margins!;
  const evenMargins = settings.evenMargins || oddMargins;

  for (let i = 0; i < embeddedPdf.pageCount; i++) {
    onProgress(`Processing page ${i + 1} of ${embeddedPdf.pageCount}...`);
    const embeddedPage = await finalPdf.embedPage(sourcePdf.getPage(i));
    const { width, height } = embeddedPage;
    const newPage = finalPdf.addPage([width, height]);
    
    const margins = (i + 1) % 2 === 0 ? evenMargins : oddMargins;
    const marginTop = margins.top * CM_TO_POINTS;
    const marginBottom = margins.bottom * CM_TO_POINTS;
    const marginLeft = margins.left * CM_TO_POINTS;
    const marginRight = margins.right * CM_TO_POINTS;
    
    const newContentWidth = width - marginLeft + marginRight;
    const newContentHeight = height - marginTop - marginBottom;
    const scaleX = newContentWidth / width;
    const scaleY = newContentHeight / height;
    const translateX = marginLeft + (width - marginLeft + marginRight - (width * scaleX)) / 2;
    const translateY = marginBottom + (height - marginBottom - marginTop - (height * scaleY)) / 2;
    
    newPage.drawPage(embeddedPage, {
      x: translateX,
      y: translateY,
      xScale: scaleX,
      yScale: scaleY
    });
    
    if (drawFrame) {
      newPage.drawRectangle({
        x: marginLeft,
        y: marginBottom,
        width: newContentWidth,
        height: newContentHeight,
        borderColor: rgb(1, 0, 0),
        borderWidth: 1
      });
    }
  }
  
  const pdfBytes = await finalPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'margins-output.pdf'
  };
}

async function processAddPageNumbers(
  sourcePdf: PDFDocument,
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const finalPdf = await PDFDocument.create();
  const totalPages = sourcePdf.getPageCount();
  
  // Provide default values for page number settings
  const pageSettings = settings.pageNumberSettings || {
    position: 'bottom-center',
    fontSize: 12,
    font: 'Helvetica',
    startNumber: 1,
    format: '{page}',
    adjustX: 0,
    adjustY: 0,
    useCustomPosition: false,
    customX: 10,
    customY: 10
  };
  
  const fontMap: Record<string, any> = {
    Helvetica: StandardFonts.Helvetica,
    TimesRoman: StandardFonts.TimesRoman,
    Courier: StandardFonts.Courier
  };
  const font = await finalPdf.embedFont(fontMap[pageSettings.font] || StandardFonts.Helvetica);

  for (let i = 0; i < totalPages; i++) {
    onProgress(`Adding number to page ${i + 1} of ${totalPages}...`);
    const [copiedPage] = await finalPdf.copyPages(sourcePdf, [i]);
    const page = finalPdf.addPage(copiedPage);
    const { width, height } = page.getSize();
    const pageNum = i + pageSettings.startNumber;
    const text = pageSettings.format.replace('{page}', pageNum.toString()).replace('{total}', totalPages.toString());
    const textWidth = font.widthOfTextAtSize(text, pageSettings.fontSize);
    const textHeight = font.heightAtSize(pageSettings.fontSize);
    
    let x: number, y: number;

    if (pageSettings.useCustomPosition) {
      // Use custom X/Y position in millimeters
      x = (pageSettings.customX || 10) * MM_TO_POINTS;
      y = (pageSettings.customY || 10) * MM_TO_POINTS;
    } else {
      // Use preset position
      const margin = 36; // 0.5 inch
      
      if (pageSettings.position.includes('bottom')) y = margin;
      if (pageSettings.position.includes('top')) y = height - textHeight - margin;
      if (pageSettings.position.includes('left')) x = margin;
      if (pageSettings.position.includes('right')) x = width - textWidth - margin;
      if (pageSettings.position.includes('center')) {
        if (pageSettings.position.startsWith('bottom') || pageSettings.position.startsWith('top')) {
          x = (width - textWidth) / 2;
        }
      }
      
      // Apply adjustments for preset positions
      x = x! + (pageSettings.adjustX * MM_TO_POINTS);
      y = y! + (pageSettings.adjustY * MM_TO_POINTS);
    }
    
    page.drawText(text, {
      x,
      y,
      font,
      size: pageSettings.fontSize,
      color: rgb(0, 0, 0)
    });
  }
  
  const pdfBytes = await finalPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'numbered-output.pdf'
  };
}

async function processImposition(
  sourcePdf: PDFDocument,
  settings: PdfManipulationSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const finalPdf = await PDFDocument.create();
  const pageIndices = sourcePdf.getPageIndices();
  const [baseWidthLandscape, baseHeightLandscape] = PDF_TOOL_PAPER_SIZES_POINTS[settings.paperSize];

  // Embed all pages from the source PDF at once for optimization
  const embeddedPages = await finalPdf.embedPdf(sourcePdf, pageIndices);

  /**
   * Draws a pre-embedded page into a specified region of a target page, scaling it to fit.
   */
  const drawPageOnSheet = (embeddedPage: any, xOffset: number, yOffset: number, targetWidth: number, targetHeight: number, targetPage: any, borderThickness: number = 0) => {
    if (!embeddedPage) return; // Handles null for blank padded pages

    const { width: oW, height: oH } = embeddedPage;
    
    let x: number, y: number, sW: number, sH: number;
    
    if (borderThickness === 0) {
      // No border: fill the entire allocated space
      sW = targetWidth;
      sH = targetHeight;
      x = xOffset;
      y = yOffset;
    } else {
      // With border: calculate scale based on border thickness (convert percentage to decimal)
      const borderFactor = 1 - (borderThickness / 100);
      const scale = Math.min((targetWidth * borderFactor) / oW, (targetHeight * borderFactor) / oH);
      sW = oW * scale;
      sH = oH * scale;
      
      // Center the scaled page within its designated region
      x = xOffset + (targetWidth - sW) / 2;
      y = yOffset + (targetHeight - sH) / 2;
    }
    
    targetPage.drawPage(embeddedPage, { x, y, width: sW, height: sH });
  };

  const borderThickness = settings.borderThickness || 5; // Default 5% border if not specified

  if (settings.mode === '2up-landscape') {
    for (let i = 0; i < pageIndices.length; i++) {
      onProgress(`Processing page ${i + 1} of ${pageIndices.length}...`);
      const newPage = finalPdf.addPage([baseWidthLandscape, baseHeightLandscape]);
      const embeddedPage = embeddedPages[i];
      // Draw left side
      drawPageOnSheet(embeddedPage, 0, 0, baseWidthLandscape / 2, baseHeightLandscape, newPage, borderThickness);
      // Draw right side
      drawPageOnSheet(embeddedPage, baseWidthLandscape / 2, 0, baseWidthLandscape / 2, baseHeightLandscape, newPage, borderThickness);
    }
  } else if (settings.mode === '4up-portrait') {
    const outputPageWidth = baseHeightLandscape;
    const outputPageHeight = baseWidthLandscape;
    for (let i = 0; i < pageIndices.length; i++) {
      onProgress(`Processing page ${i + 1} of ${pageIndices.length}...`);
      const newPage = finalPdf.addPage([outputPageWidth, outputPageHeight]);
      const embeddedPage = embeddedPages[i];
      const cellWidth = outputPageWidth / 2;
      const cellHeight = outputPageHeight / 2;
      
      // Draw in 4 quadrants (top-left, top-right, bottom-left, bottom-right)
      drawPageOnSheet(embeddedPage, 0, cellHeight, cellWidth, cellHeight, newPage, borderThickness);
      drawPageOnSheet(embeddedPage, cellWidth, cellHeight, cellWidth, cellHeight, newPage, borderThickness);
      drawPageOnSheet(embeddedPage, 0, 0, cellWidth, cellHeight, newPage, borderThickness);
      drawPageOnSheet(embeddedPage, cellWidth, 0, cellWidth, cellHeight, newPage, borderThickness);
    }
  } else if (settings.mode === 'booklet-saddlestitch') {
    // Pad pages to multiple of 4 for proper saddle stitch
    let paddedIndices = [...pageIndices];
    while (paddedIndices.length % 4 !== 0) {
      paddedIndices.push(null);
    }
    
    const numSheets = paddedIndices.length / 4;
    
    for (let i = 0; i < numSheets; i++) {
      onProgress(`Processing Sheet ${i + 1}/${numSheets}...`);

      // Calculate page positions for saddle stitch
      // For sheet i (0-indexed):
      // Front: [last - (2*i+1), first + (2*i)]
      // Back:  [first + (2*i+1), last - (2*i)]
      
      const firstPageIdx = 2 * i;
      const lastPageIdx = paddedIndices.length - 1 - (2 * i);
      const secondPageIdx = 2 * i + 1;
      const secondLastPageIdx = paddedIndices.length - 2 - (2 * i);

      // --- Front of Sheet ---
      const frontPage = finalPdf.addPage([baseWidthLandscape, baseHeightLandscape]);
      
      // Left side: last page for this sheet (reading order)
      const frontLeftIdx = paddedIndices[lastPageIdx];
      const frontLeftPage = frontLeftIdx !== null ? embeddedPages[frontLeftIdx] : null;
      
      // Right side: first page for this sheet (reading order)
      const frontRightIdx = paddedIndices[firstPageIdx];
      const frontRightPage = frontRightIdx !== null ? embeddedPages[frontRightIdx] : null;
      
      drawPageOnSheet(frontLeftPage, 0, 0, baseWidthLandscape / 2, baseHeightLandscape, frontPage);
      drawPageOnSheet(frontRightPage, baseWidthLandscape / 2, 0, baseWidthLandscape / 2, baseHeightLandscape, frontPage);

      // --- Back of Sheet ---
      const backPage = finalPdf.addPage([baseWidthLandscape, baseHeightLandscape]);
      
      // Left side: second page for this sheet (reading order)
      const backLeftIdx = paddedIndices[secondPageIdx];
      const backLeftPage = backLeftIdx !== null ? embeddedPages[backLeftIdx] : null;
      
      // Right side: second to last page for this sheet (reading order)
      const backRightIdx = paddedIndices[secondLastPageIdx];
      const backRightPage = backRightIdx !== null ? embeddedPages[backRightIdx] : null;
      
      drawPageOnSheet(backLeftPage, 0, 0, baseWidthLandscape / 2, baseHeightLandscape, backPage);
      drawPageOnSheet(backRightPage, baseWidthLandscape / 2, 0, baseWidthLandscape / 2, baseHeightLandscape, backPage);
    }
  } else if (settings.mode === '2up-cut-stack') {
    // Pad pages to even number
    let paddedIndices = [...pageIndices];
    while (paddedIndices.length % 2 !== 0) {
      paddedIndices.push(null);
    }
    
    const halfPoint = paddedIndices.length / 2;
    for (let i = 0; i < halfPoint; i++) {
      onProgress(`Processing Sheet ${i + 1}/${halfPoint}...`);
      const newPage = finalPdf.addPage([baseWidthLandscape, baseHeightLandscape]);
      const idxLeft = paddedIndices[i];
      const pageLeft = idxLeft !== null ? embeddedPages[idxLeft] : null;
      const idxRight = paddedIndices[i + halfPoint];
      const pageRight = idxRight !== null ? embeddedPages[idxRight] : null;
      drawPageOnSheet(pageLeft, 0, 0, baseWidthLandscape / 2, baseHeightLandscape, newPage);
      drawPageOnSheet(pageRight, baseWidthLandscape / 2, 0, baseWidthLandscape / 2, baseHeightLandscape, newPage);
    }
  }

  const pdfBytes = await finalPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `${settings.mode}-output.pdf`
  };
}

export async function processBookWrapperImages(
  imageFiles: File[],
  settings: BookWrapperSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress(`Loading ${imageFiles.length} file(s)...`);

  const loadedImages: HTMLImageElement[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    onProgress(`Loading file ${i + 1} of ${imageFiles.length}: ${imageFiles[i].name}...`);
    loadedImages.push(await fileToHTMLImage(imageFiles[i]));
  }

  onProgress(`Processing ${loadedImages.length} image(s)...`);
  
  // Convert all dimensions to points (1/72 inch)
  const convertToPoints = (value: number, unit: 'mm' | 'cm' | 'in'): number => {
    switch (unit) {
      case 'mm': return value * MM_TO_POINTS;
      case 'cm': return value * CM_TO_POINTS;
      case 'in': return value * 72;
      default: return value;
    }
  };
  
  // Get output paper dimensions (always landscape: larger = width, smaller = height)
  let outputWidth: number, outputHeight: number;
  if (settings.outputPaperSize === 'custom') {
    const w = convertToPoints(settings.customOutputWidth || 420, settings.unit);
    const h = convertToPoints(settings.customOutputHeight || 297, settings.unit);
    outputWidth = Math.max(w, h);
    outputHeight = Math.min(w, h);
  } else {
    const outputSize = {
      'a3': [420 * MM_TO_POINTS, 297 * MM_TO_POINTS],
      'a4': [297 * MM_TO_POINTS, 210 * MM_TO_POINTS],
      'letter': [11 * 72, 8.5 * 72],
      'legal': [14 * 72, 8.5 * 72],
      'tabloid': [17 * 72, 11 * 72],
      '12x18': [18 * 72, 12 * 72],
      '13x19': [19 * 72, 13 * 72]
    }[settings.outputPaperSize] || [420 * MM_TO_POINTS, 297 * MM_TO_POINTS];

    [outputWidth, outputHeight] = outputSize;
  }

  // Convert margins to points
  const marginTop = convertToPoints(settings.marginTop, settings.unit);
  const marginBottom = convertToPoints(settings.marginBottom, settings.unit);
  const marginRight = convertToPoints(settings.marginRight, settings.unit);

  // Spine pre-calculations (done outside the loop, used for layout)
  let spineWidthPt = 0;
  let tickLengthPt = 0;
  let overlapPt = 0;
  let spineCenterX = 0;
  let spineLeft = 0;
  let spineRight = 0;
  let computedImageX = 0;
  let computedAvailableWidth = 0;

  if (settings.enableSpine && settings.spineWidth && settings.spineWidth > 0) {
    spineWidthPt = convertToPoints(settings.spineWidth, settings.unit);
    tickLengthPt = convertToPoints(settings.spineTickLength ?? 5, settings.unit);
    overlapPt = convertToPoints(settings.spineOverlap ?? 3, settings.unit);

    // Spine is centered horizontally on the output sheet
    spineCenterX = outputWidth / 2;
    spineLeft = spineCenterX - spineWidthPt / 2;
    spineRight = spineCenterX + spineWidthPt / 2;

    // A4 cover left edge = spineRight - overlapPt
    // (cover overlaps the spine by overlapPt from its left edge)
    computedImageX = spineRight - overlapPt;
    // Available width for the image: from cover left edge to right margin
    computedAvailableWidth = outputWidth - marginRight - computedImageX;
  }

  // When spine is disabled use normal margin-based layout
  const marginLeft = settings.enableSpine ? 0 : convertToPoints(settings.marginLeft, settings.unit);
  const availableWidth = settings.enableSpine
    ? computedAvailableWidth
    : outputWidth - marginLeft - marginRight;
  const availableHeight = outputHeight - marginTop - marginBottom;

  const finalPdf = await PDFDocument.create();

  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    onProgress(`Processing image ${i + 1} of ${loadedImages.length}...`);

    // Convert image to canvas to get dimensions and data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Convert canvas to JPEG blob
    const imageBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    });

    // Convert blob to array buffer
    const imageBytes = await imageBlob.arrayBuffer();

    // Embed the image in the PDF
    const embeddedImage = await finalPdf.embedJpg(imageBytes);
    const { width: originalWidth, height: originalHeight } = embeddedImage;

    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / originalWidth;
    const scaleY = availableHeight / originalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    // When spine is enabled: X is fixed at cover left edge (spine-derived).
    // When disabled: use margin + optional centering.
    let x = settings.enableSpine ? computedImageX : marginLeft;
    let y = marginBottom;

    if (!settings.enableSpine && settings.centerHorizontally) {
      x = marginLeft + (availableWidth - scaledWidth) / 2;
    }

    if (settings.centerVertically) {
      y = marginBottom + (availableHeight - scaledHeight) / 2;
    }

    // Create new page with output dimensions
    const newPage = finalPdf.addPage([outputWidth, outputHeight]);

    // Draw the embedded image
    newPage.drawImage(embeddedImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight
    });

    // Draw spine marks if enabled
    if (settings.enableSpine && spineWidthPt > 0) {
      const lineColor = rgb(0, 0, 0);
      const lineThickness = 0.5;

      // Top edge ticks — left spine boundary
      newPage.drawLine({
        start: { x: spineLeft, y: outputHeight },
        end: { x: spineLeft, y: outputHeight - tickLengthPt },
        thickness: lineThickness,
        color: lineColor,
      });
      // Top edge ticks — right spine boundary
      newPage.drawLine({
        start: { x: spineRight, y: outputHeight },
        end: { x: spineRight, y: outputHeight - tickLengthPt },
        thickness: lineThickness,
        color: lineColor,
      });

      // Bottom edge ticks — left spine boundary
      newPage.drawLine({
        start: { x: spineLeft, y: 0 },
        end: { x: spineLeft, y: tickLengthPt },
        thickness: lineThickness,
        color: lineColor,
      });
      // Bottom edge ticks — right spine boundary
      newPage.drawLine({
        start: { x: spineRight, y: 0 },
        end: { x: spineRight, y: tickLengthPt },
        thickness: lineThickness,
        color: lineColor,
      });

      // Dashed overlap guide at the cover's left edge (= spineRight - overlapPt = x)
      // Shows exactly where the A4 cover starts, which overlaps the spine by overlapPt
      newPage.drawLine({
        start: { x: computedImageX, y: outputHeight },
        end: { x: computedImageX, y: outputHeight - tickLengthPt },
        thickness: lineThickness,
        color: rgb(0.4, 0.4, 0.4),
        dashArray: [3, 3],
      });
      newPage.drawLine({
        start: { x: computedImageX, y: 0 },
        end: { x: computedImageX, y: tickLengthPt },
        thickness: lineThickness,
        color: rgb(0.4, 0.4, 0.4),
        dashArray: [3, 3],
      });
    }
  }

  onProgress('Finalizing PDF...');
  const pdfBytes = await finalPdf.save();

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'book-wrapper-images-output.pdf'
  };
}

export async function processBookWrapper(
  pdfFile: File,
  settings: BookWrapperSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress('Loading PDF...');
  
  const fileBuffer = await pdfFile.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer);
  const totalPages = sourcePdf.getPageCount();
  
  onProgress(`Processing ${totalPages} pages...`);
  
  // Convert all dimensions to points (1/72 inch)
  const convertToPoints = (value: number, unit: 'mm' | 'cm' | 'in'): number => {
    switch (unit) {
      case 'mm': return value * MM_TO_POINTS;
      case 'cm': return value * CM_TO_POINTS;
      case 'in': return value * 72;
      default: return value;
    }
  };
  
  // Get output paper dimensions (always landscape: larger = width, smaller = height)
  let outputWidth: number, outputHeight: number;
  if (settings.outputPaperSize === 'custom') {
    const w = convertToPoints(settings.customOutputWidth || 420, settings.unit);
    const h = convertToPoints(settings.customOutputHeight || 297, settings.unit);
    outputWidth = Math.max(w, h);
    outputHeight = Math.min(w, h);
  } else {
    const outputSize = {
      'a3': [420 * MM_TO_POINTS, 297 * MM_TO_POINTS],
      'a4': [297 * MM_TO_POINTS, 210 * MM_TO_POINTS],
      'letter': [11 * 72, 8.5 * 72],
      'legal': [14 * 72, 8.5 * 72],
      'tabloid': [17 * 72, 11 * 72],
      '12x18': [18 * 72, 12 * 72],
      '13x19': [19 * 72, 13 * 72]
    }[settings.outputPaperSize] || [420 * MM_TO_POINTS, 297 * MM_TO_POINTS];

    [outputWidth, outputHeight] = outputSize;
  }

  // Convert margins to points
  const marginTop = convertToPoints(settings.marginTop, settings.unit);
  const marginBottom = convertToPoints(settings.marginBottom, settings.unit);
  const marginLeft = convertToPoints(settings.marginLeft, settings.unit);
  const marginRight = convertToPoints(settings.marginRight, settings.unit);
  
  // Calculate available space for content
  const availableWidth = outputWidth - marginLeft - marginRight;
  const availableHeight = outputHeight - marginTop - marginBottom;
  
  const finalPdf = await PDFDocument.create();
  const [embeddedPdf] = await finalPdf.embedPdf(sourcePdf);
  
  for (let i = 0; i < totalPages; i++) {
    onProgress(`Processing page ${i + 1} of ${totalPages}...`);
    
    const embeddedPage = embeddedPdf.get(i);
    const { width: originalWidth, height: originalHeight } = embeddedPage;
    
    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / originalWidth;
    const scaleY = availableHeight / originalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;
    
    // Calculate position based on centering options
    let x = marginLeft;
    let y = marginBottom;
    
    if (settings.centerHorizontally) {
      x = marginLeft + (availableWidth - scaledWidth) / 2;
    }
    
    if (settings.centerVertically) {
      y = marginBottom + (availableHeight - scaledHeight) / 2;
    }
    
    // Create new page with output dimensions
    const newPage = finalPdf.addPage([outputWidth, outputHeight]);
    
    // Draw the embedded page
    newPage.drawPage(embeddedPage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight
    });
  }
  
  onProgress('Finalizing PDF...');
  const pdfBytes = await finalPdf.save();
  
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'book-wrapper-output.pdf'
  };
}

// Canvas Wrapper: Same as A4 Book Wrapper but uses a background image instead of white background
export async function processCanvasWrapper(
  backgroundFile: File,
  pdfFile: File,
  settings: BookWrapperSettings,
  onProgress: (message: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress('Loading background image...');

  // Load background image
  const backgroundImg = await loadImage(backgroundFile);

  onProgress('Loading PDF...');
  const fileBuffer = await pdfFile.arrayBuffer();

  // Load with pdfjs for rendering with transparency
  const pdfjsDoc = await getDocument({ data: fileBuffer }).promise;

  onProgress('Processing first page with transparency...');

  // Canvas Wrapper always uses 13x19" (landscape)
  const outputWidth = 19 * 72;  // 19 inches in points
  const outputHeight = 13 * 72; // 13 inches in points

  // Convert all dimensions to points (1/72 inch)
  const convertToPoints = (value: number, unit: 'mm' | 'cm' | 'in'): number => {
    switch (unit) {
      case 'mm': return value * MM_TO_POINTS;
      case 'cm': return value * CM_TO_POINTS;
      case 'in': return value * 72;
      default: return value;
    }
  };

  // Convert margins to points
  const marginTop = convertToPoints(settings.marginTop, settings.unit);
  const marginBottom = convertToPoints(settings.marginBottom, settings.unit);
  const marginLeft = convertToPoints(settings.marginLeft, settings.unit);
  const marginRight = convertToPoints(settings.marginRight, settings.unit);

  // Calculate available space for content
  const availableWidth = outputWidth - marginLeft - marginRight;
  const availableHeight = outputHeight - marginTop - marginBottom;

  const finalPdf = await PDFDocument.create();

  // Convert background image to PNG bytes for embedding
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = backgroundImg.width;
  bgCanvas.height = backgroundImg.height;
  const bgCtx = bgCanvas.getContext('2d')!;
  bgCtx.drawImage(backgroundImg, 0, 0);

  const bgBlob = await new Promise<Blob>((resolve) => {
    bgCanvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
  const bgBytes = await bgBlob.arrayBuffer();
  const embeddedBg = await finalPdf.embedPng(bgBytes);

  // Process only the first page
  onProgress('Rendering first page with transparency...');

  // Get first page from pdfjs for rendering with transparency
  const pdfjsPage = await pdfjsDoc.getPage(1);
  const viewport = pdfjsPage.getViewport({ scale: 2.0 }); // Higher scale for quality

  const originalWidth = viewport.width / 2.0 * 0.75; // Convert back to points
  const originalHeight = viewport.height / 2.0 * 0.75;

  // Calculate scale to fit within available space while maintaining aspect ratio
  const scaleX = availableWidth / originalWidth;
  const scaleY = availableHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;

  // Calculate position based on centering options
  let x = marginLeft;
  let y = marginBottom;

  if (settings.centerHorizontally) {
    x = marginLeft + (availableWidth - scaledWidth) / 2;
  }

  if (settings.centerVertically) {
    y = marginBottom + (availableHeight - scaledHeight) / 2;
  }

  // Render PDF page to canvas with transparency
  const pdfCanvas = document.createElement('canvas');
  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;
  const pdfCtx = pdfCanvas.getContext('2d')!;

  // Render with transparent background
  await pdfjsPage.render({
    canvasContext: pdfCtx,
    viewport: viewport,
    background: 'rgba(0,0,0,0)' // Transparent background
  }).promise;

  // Convert rendered PDF page to PNG with transparency
  const pdfPageBlob = await new Promise<Blob>((resolve) => {
    pdfCanvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
  const pdfPageBytes = await pdfPageBlob.arrayBuffer();
  const embeddedPdfPage = await finalPdf.embedPng(pdfPageBytes);

  // Create new page with output dimensions
  const newPage = finalPdf.addPage([outputWidth, outputHeight]);

  // Draw background image (stretched to full page)
  newPage.drawImage(embeddedBg, {
    x: 0,
    y: 0,
    width: outputWidth,
    height: outputHeight
  });

  // Draw the transparent PDF page on top
  newPage.drawImage(embeddedPdfPage, {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight
  });

  onProgress('Finalizing PDF...');
  const pdfBytes = await finalPdf.save();

  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'canvas-wrapper-output.pdf'
  };
}