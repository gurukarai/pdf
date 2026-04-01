import JSZip from 'jszip';
import { BulkImageSplitterSettings } from '../types';

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
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

export function splitImageIntoCanvas(
  img: HTMLImageElement,
  numberOfParts: number,
  splitPercentage: number,
  direction: 'horizontal' | 'vertical'
): HTMLCanvasElement[] {
  const canvases: HTMLCanvasElement[] = [];
  
  if (numberOfParts === 1) {
    // No splitting needed, return the original image
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return [canvas];
  }

  if (numberOfParts === 2) {
    // Split into 2 parts based on percentage
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    
    if (direction === 'horizontal') {
      // Split horizontally (top/bottom)
      const splitPoint = Math.floor((img.height * splitPercentage) / 100);
      
      // Top part
      canvas1.width = img.width;
      canvas1.height = splitPoint;
      const ctx1 = canvas1.getContext('2d')!;
      ctx1.drawImage(img, 0, 0, img.width, splitPoint, 0, 0, img.width, splitPoint);
      
      // Bottom part
      canvas2.width = img.width;
      canvas2.height = img.height - splitPoint;
      const ctx2 = canvas2.getContext('2d')!;
      ctx2.drawImage(img, 0, splitPoint, img.width, img.height - splitPoint, 0, 0, img.width, img.height - splitPoint);
    } else {
      // Split vertically (left/right)
      const splitPoint = Math.floor((img.width * splitPercentage) / 100);
      
      // Left part
      canvas1.width = splitPoint;
      canvas1.height = img.height;
      const ctx1 = canvas1.getContext('2d')!;
      ctx1.drawImage(img, 0, 0, splitPoint, img.height, 0, 0, splitPoint, img.height);
      
      // Right part
      canvas2.width = img.width - splitPoint;
      canvas2.height = img.height;
      const ctx2 = canvas2.getContext('2d')!;
      ctx2.drawImage(img, splitPoint, 0, img.width - splitPoint, img.height, 0, 0, img.width - splitPoint, img.height);
    }
    
    canvases.push(canvas1, canvas2);
  } else {
    // Split into equal parts for 3+ parts
    if (direction === 'horizontal') {
      const partHeight = Math.floor(img.height / numberOfParts);
      
      for (let i = 0; i < numberOfParts; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = i === numberOfParts - 1 ? img.height - (partHeight * i) : partHeight; // Last part gets remainder
        
        const ctx = canvas.getContext('2d')!;
        const sourceY = partHeight * i;
        const sourceHeight = canvas.height;
        
        ctx.drawImage(img, 0, sourceY, img.width, sourceHeight, 0, 0, img.width, sourceHeight);
        canvases.push(canvas);
      }
    } else {
      const partWidth = Math.floor(img.width / numberOfParts);
      
      for (let i = 0; i < numberOfParts; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = i === numberOfParts - 1 ? img.width - (partWidth * i) : partWidth; // Last part gets remainder
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d')!;
        const sourceX = partWidth * i;
        const sourceWidth = canvas.width;
        
        ctx.drawImage(img, sourceX, 0, sourceWidth, img.height, 0, 0, sourceWidth, img.height);
        canvases.push(canvas);
      }
    }
  }
  
  return canvases;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/jpeg', quality);
  });
}

export async function processBulkImageSplitting(
  imageFiles: File[],
  settings: BulkImageSplitterSettings,
  onProgress: (message: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  
  onProgress(`Loading ${imageFiles.length} images...`);
  
  for (let fileIndex = 0; fileIndex < imageFiles.length; fileIndex++) {
    const file = imageFiles[fileIndex];
    onProgress(`Processing ${file.name} (${fileIndex + 1}/${imageFiles.length})...`);
    
    try {
      // Load the image
      const img = await loadImageFromFile(file);
      
      // Split the image
      const canvases = splitImageIntoCanvas(
        img,
        settings.numberOfParts,
        settings.splitPercentage,
        settings.splitDirection
      );
      
      // Convert each canvas to blob and add to zip
      for (let partIndex = 0; partIndex < canvases.length; partIndex++) {
        const canvas = canvases[partIndex];
        const blob = await canvasToBlob(canvas);
        
        // Create filename: originalname_part1.jpg, originalname_part2.jpg, etc.
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const partFileName = `${baseName}_part${partIndex + 1}.jpg`;
        
        zip.file(partFileName, blob);
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      onProgress(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  onProgress('Creating ZIP file...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  return zipBlob;
}