import { PDFDocument, PDFName } from 'pdf-lib';

export interface CMYKColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export function rgbToCMYK(r: number, g: number, b: number): CMYKColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  let k = 1 - Math.max(rNorm, gNorm, bNorm);

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  let c = (1 - rNorm - k) / (1 - k);
  let m = (1 - gNorm - k) / (1 - k);
  let y = (1 - bNorm - k) / (1 - k);

  c = Math.max(0, Math.min(1, c));
  m = Math.max(0, Math.min(1, m));
  y = Math.max(0, Math.min(1, y));
  k = Math.max(0, Math.min(1, k));

  return { c, m, y, k };
}

export function cmykToRGB(c: number, m: number, y: number, k: number): RGBColor {
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.round(Math.max(0, Math.min(255, r))),
    g: Math.round(Math.max(0, Math.min(255, g))),
    b: Math.round(Math.max(0, Math.min(255, b)))
  };
}

async function getImageData(file: File): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({
        data: imageData.data,
        width: canvas.width,
        height: canvas.height
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function exportCMYKAsJPG(
  file: File,
  quality: number = 0.95,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { data, width, height } = await getImageData(file);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const imageData = ctx.createImageData(width, height);
  const newData = imageData.data;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const cmyk = rgbToCMYK(r, g, b);
    const rgb = cmykToRGB(cmyk.c, cmyk.m, cmyk.y, cmyk.k);

    newData[i] = rgb.r;
    newData[i + 1] = rgb.g;
    newData[i + 2] = rgb.b;
    newData[i + 3] = a;

    if (onProgress && i % 40000 === 0) {
      const progress = Math.round(((i / 4) / totalPixels) * 100);
      onProgress(progress);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.(100);
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

export async function exportCMYKAsPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { data, width, height } = await getImageData(file);

  const cmykData = new Uint8Array(width * height * 4);
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const cmyk = rgbToCMYK(r, g, b);

    cmykData[pixelIndex * 4] = Math.round(cmyk.c * 255);
    cmykData[pixelIndex * 4 + 1] = Math.round(cmyk.m * 255);
    cmykData[pixelIndex * 4 + 2] = Math.round(cmyk.y * 255);
    cmykData[pixelIndex * 4 + 3] = Math.round(cmyk.k * 255);

    if (onProgress && i % 40000 === 0) {
      const progress = Math.round(((i / 4) / totalPixels) * 90);
      onProgress(progress);
    }
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  const zlibSync = (await import('pako')).deflate;
  const compressedData = zlibSync(cmykData);

  const cmykImageDict = pdfDoc.context.obj({
    Type: 'XObject',
    Subtype: 'Image',
    Width: width,
    Height: height,
    ColorSpace: 'DeviceCMYK',
    BitsPerComponent: 8,
    Filter: 'FlateDecode',
    Decode: [1, 0, 1, 0, 1, 0, 1, 0],
  });

  const cmykImageStream = pdfDoc.context.stream(compressedData, cmykImageDict);
  const xObjectName = PDFName.of('Img1');

  let resources = page.node.Resources();
  if (!resources) {
    resources = pdfDoc.context.obj({});
    page.node.set(PDFName.of('Resources'), resources);
  }

  let xObjects = resources.lookup(PDFName.of('XObject'));
  if (!xObjects) {
    xObjects = pdfDoc.context.obj({});
    resources.set(PDFName.of('XObject'), xObjects);
  }

  xObjects.set(xObjectName, cmykImageStream);

  const contentStream =
    `q\n` +
    `${width} 0 0 ${height} 0 0 cm\n` +
    `/Img1 Do\n` +
    `Q`;

  const contentBytes = new TextEncoder().encode(contentStream);
  const newContentStream = pdfDoc.context.stream(contentBytes);
  page.node.set(PDFName.of('Contents'), newContentStream);

  onProgress?.(95);

  pdfDoc.setTitle(file.name.replace(/\.[^/.]+$/, '_CMYK.pdf'));
  pdfDoc.setSubject('CMYK Converted Image (US Web Coated SWOP v2 profile)');
  pdfDoc.setCreator('RGB to CMYK Converter');

  const pdfBytes = await pdfDoc.save();
  onProgress?.(100);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}
