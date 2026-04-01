import { jsPDF } from 'jspdf';

// Constants matching the original script
const DPI = 300;
const CARD_WIDTH_MM = 87;
const CARD_HEIGHT_MM = 55;
const GAP_MM = 2;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CARDS_PER_SHEET = 10;
const CARDS_PER_ROW = 2;
const CARDS_PER_COLUMN = 5;

// Helper function: MM to Pixels
function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * DPI);
}

// Computed pixel values
const CARD_WIDTH_PX = mmToPx(CARD_WIDTH_MM);
const CARD_HEIGHT_PX = mmToPx(CARD_HEIGHT_MM);
const GAP_PX = mmToPx(GAP_MM);
const A4_WIDTH_PX = mmToPx(A4_WIDTH_MM);
const A4_HEIGHT_PX = mmToPx(A4_HEIGHT_MM);

// Interface for card generation options
interface CardGenerationOptions {
  orientation: 'horizontal' | 'vertical';
  frontShift: { top: number; bottom: number; left: number; right: number };
  backShift: { top: number; bottom: number; left: number; right: number };
}
// Helper function: Draw crop marks
function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  markLenPx: number = mmToPx(1.5),
  color: string = '#B4B4B4',
  width: number = 1
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + markLenPx, y); // Horizontal
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + markLenPx); // Vertical
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w - markLenPx, y); // Horizontal
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + markLenPx); // Vertical
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + markLenPx, y + h); // Horizontal
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h - markLenPx); // Vertical
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w, y + h);
  ctx.lineTo(x + w - markLenPx, y + h); // Horizontal
  ctx.moveTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - markLenPx); // Vertical
  ctx.stroke();
}

// Helper function: Load image
function loadImage(file: File): Promise<HTMLImageElement> {
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

// Helper function: Rotate image on canvas
function rotateImage(img: HTMLImageElement, angle: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // For 90 degree rotations, swap width and height
  if (Math.abs(angle) === 90) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }
  
  // Move to center, rotate, then move back
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  return canvas;
}
// Main function: Create sheet on canvas
function createSheet(
  images: HTMLImageElement[], 
  isBack: boolean = false, 
  options: CardGenerationOptions
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_PX;
  canvas.height = A4_HEIGHT_PX;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const totalCardWidth = CARD_WIDTH_PX * CARDS_PER_ROW + GAP_PX * (CARDS_PER_ROW - 1);
  const totalCardHeight = CARD_HEIGHT_PX * CARDS_PER_COLUMN + GAP_PX * (CARDS_PER_COLUMN - 1);

  const marginX = (A4_WIDTH_PX - totalCardWidth) / 2;
  const marginY = (A4_HEIGHT_PX - totalCardHeight) / 2;

  // Get shift values for current side
  const shift = isBack ? options.backShift : options.frontShift;
  const shiftXPx = mmToPx(shift.right - shift.left);
  const shiftYPx = mmToPx(shift.bottom - shift.top);
  images.forEach((img, idx) => {
    let row = Math.floor(idx / CARDS_PER_ROW);
    let col = idx % CARDS_PER_ROW;

    if (isBack) {
      col = CARDS_PER_ROW - 1 - col; // Flip horizontally for back side
    }

    const x = marginX + col * (CARD_WIDTH_PX + GAP_PX) + shiftXPx;
    const y = marginY + row * (CARD_HEIGHT_PX + GAP_PX) + shiftYPx;

    // Handle rotation for vertical orientation
    if (options.orientation === 'vertical') {
      const rotationAngle = isBack ? 90 : -90; // Front: counter-clockwise, Back: clockwise
      const rotatedCanvas = rotateImage(img, rotationAngle);
      
      // Draw rotated image, scaling to fit card dimensions
      ctx.drawImage(rotatedCanvas, x, y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
    } else {
      // Draw image normally, resizing it to fit the card dimensions
      ctx.drawImage(img, x, y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
    }

    // Draw corner crop marks around the image
    drawCropMarks(ctx, x, y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
  });

  return canvas;
}

// Natural sort function for filenames
function naturalSort(a: File, b: File): number {
  const re = /(\d+)/g;
  const parse = (s: string) => (s.match(re) || []).map(n => parseInt(n, 10) || n);
  const A = parse(a.name);
  const B = parse(b.name);
  
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    if (typeof A[i] === 'number' && typeof B[i] === 'number') {
      if (A[i] !== B[i]) return (A[i] as number) - (B[i] as number);
    } else {
      if (A[i] !== B[i]) return (A[i] as string).localeCompare(B[i] as string);
    }
  }
  return A.length - B.length;
}

// Main export function
export async function generateDualSideCards(
  frontImageFiles: File[],
  backImageFiles: File[],
  options: CardGenerationOptions,
  onProgress: (message: string) => void
): Promise<Blob> {
  // Sort files naturally
  const sortedFrontFiles = [...frontImageFiles].sort(naturalSort);
  const sortedBackFiles = [...backImageFiles].sort(naturalSort);

  onProgress('Loading images...');
  
  // Load all images
  const loadedFrontImages = await Promise.all(sortedFrontFiles.map(loadImage));
  const loadedBackImages = await Promise.all(sortedBackFiles.map(loadImage));
  
  onProgress('Images loaded successfully. Generating sheets...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let pageCount = 0;
  
  for (let i = 0; i < loadedFrontImages.length; i += CARDS_PER_SHEET) {
    const currentFrontBatch = loadedFrontImages.slice(i, i + CARDS_PER_SHEET);
    const currentBackBatch = loadedBackImages.slice(i, i + CARDS_PER_SHEET);

    if (currentFrontBatch.length === 0) {
      break; // No more cards
    }

    // Create front sheet
    const frontSheetCanvas = createSheet(currentFrontBatch, false, options);
    const frontSheetDataUrl = frontSheetCanvas.toDataURL('image/jpeg', 0.9);
    
    if (pageCount > 0) doc.addPage();
    doc.addImage(frontSheetDataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    pageCount++;

    // Create back sheet
    const backSheetCanvas = createSheet(currentBackBatch, true, options);
    const backSheetDataUrl = backSheetCanvas.toDataURL('image/jpeg', 0.9);
    
    doc.addPage();
    doc.addImage(backSheetDataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    pageCount++;
    
    onProgress(`Generated sheet pair ${pageCount / 2}. Total pages: ${pageCount}`);
  }

  if (pageCount === 0) {
    throw new Error('No cards processed. Ensure files are correctly named and valid.');
  }

  return doc.output('blob');
}