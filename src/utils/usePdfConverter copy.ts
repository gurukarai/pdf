import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ConvertedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
}

export const usePdfConverter = () => {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const convertPdfToImages = useCallback(async (file: File) => {
    setIsConverting(true);
    setImages([]);
    setCurrentPage(0);
    setTotalPages(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);

      const convertedImages: ConvertedImage[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setCurrentPage(pageNum);
        
        const page = await pdf.getPage(pageNum);
        const scale = 2; // Higher scale for better quality
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
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/png', 1.0);
        });

        const dataUrl = canvas.toDataURL('image/png', 1.0);

        convertedImages.push({
          pageNumber: pageNum,
          dataUrl,
          blob,
        });

        // Update state with current progress
        setImages([...convertedImages]);
      }

      setIsConverting(false);
    } catch (error) {
      console.error('Error converting PDF:', error);
      setIsConverting(false);
    }
  }, []);

  const downloadSingleImage = useCallback((image: ConvertedImage) => {
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-${image.pageNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllImages = useCallback(async () => {
    if (images.length === 0) return;

    const zip = new JSZip();
    
    images.forEach((image) => {
      zip.file(`page-${image.pageNumber}.png`, image.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [images]);

  const resetConverter = useCallback(() => {
    setImages([]);
    setIsConverting(false);
    setCurrentPage(0);
    setTotalPages(0);
  }, []);

  return {
    images,
    isConverting,
    currentPage,
    totalPages,
    convertPdfToImages,
    downloadSingleImage,
    downloadAllImages,
    resetConverter,
  };
};