import React, { useState, useEffect } from 'react';
import { Upload, Download, Scissors } from 'lucide-react';
import JSZip from 'jszip';

export default function ImageCropper() {
  const [files, setFiles] = useState<File[]>([]);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [cropping, setCropping] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);

      if (fileList.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          setPreviewUrl(url);

          const img = new Image();
          img.onload = () => {
            setOriginalDimensions({ width: img.width, height: img.height });
          };
          img.src = url;
        };
        reader.readAsDataURL(fileList[0]);
      }
    }
  };

  const cropImage = async (file: File): Promise<{ blob: Blob; filename: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const cropLeftPx = Math.round(img.width * (cropLeft / 100));
        const cropRightPx = Math.round(img.width * (cropRight / 100));
        const cropTopPx = Math.round(img.height * (cropTop / 100));
        const cropBottomPx = Math.round(img.height * (cropBottom / 100));

        const newWidth = img.width - cropLeftPx - cropRightPx;
        const newHeight = img.height - cropTopPx - cropBottomPx;

        if (newWidth <= 0 || newHeight <= 0) {
          reject(new Error('Crop values are too large'));
          return;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.drawImage(
          img,
          cropLeftPx,
          cropTopPx,
          newWidth,
          newHeight,
          0,
          0,
          newWidth,
          newHeight
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const ext = file.name.substring(file.name.lastIndexOf('.'));
              const filename = `${originalName}_cropped${ext}`;
              resolve({ blob, filename });
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          file.type || 'image/png'
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  };

  const handleCrop = async () => {
    if (files.length === 0) return;

    setCropping(true);
    setProgress('Cropping images...');

    try {
      if (files.length === 1) {
        const { blob, filename } = await cropImage(files[0]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('Cropping complete!');
      } else {
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          setProgress(`Cropping image ${i + 1} of ${files.length}...`);
          const { blob, filename } = await cropImage(files[i]);
          zip.file(filename, blob);
        }

        setProgress('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cropped-images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('All images cropped!');
      }
    } catch (error) {
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCropping(false);
    }
  };

  const totalCropPercentage = cropLeft + cropRight + cropTop + cropBottom;
  const isValidCrop = totalCropPercentage < 100;

  const newWidth = originalDimensions.width * (1 - (cropLeft + cropRight) / 100);
  const newHeight = originalDimensions.height * (1 - (cropTop + cropBottom) / 100);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <Scissors className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Image Cropper</h2>
          <p className="text-slate-600">Crop images using percentage values</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Images
            </label>
            <label className="flex flex-col items-center px-4 py-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-600">
                {files.length === 0 ? 'Click to upload images' : `${files.length} file(s) selected`}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Crop Left: {cropLeft}%
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={cropLeft}
                onChange={(e) => setCropLeft(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Crop Right: {cropRight}%
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={cropRight}
                onChange={(e) => setCropRight(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Crop Top: {cropTop}%
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={cropTop}
                onChange={(e) => setCropTop(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Crop Bottom: {cropBottom}%
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={cropBottom}
                onChange={(e) => setCropBottom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {originalDimensions.width > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Original:</span> {originalDimensions.width} × {originalDimensions.height}px
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">New:</span> {Math.round(newWidth)} × {Math.round(newHeight)}px
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Remaining:</span> {Math.round(100 - totalCropPercentage)}%
              </p>
            </div>
          )}

          {!isValidCrop && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Crop values exceed 100%</p>
            </div>
          )}

          <button
            onClick={handleCrop}
            disabled={files.length === 0 || cropping || !isValidCrop}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-5 h-5" />
            {cropping ? 'Cropping...' : 'Crop & Download'}
          </button>

          {progress && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{progress}</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-8 h-fit">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Preview
          </label>
          <div className="bg-slate-50 border-2 border-slate-300 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    clipPath: `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`,
                  }}
                />
              </div>
            ) : (
              <p className="text-slate-400">Upload an image to preview</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
