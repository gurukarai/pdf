import React, { useState } from 'react';
import { Upload, Download, FileImage } from 'lucide-react';
import JSZip from 'jszip';
import heic2any from 'heic2any';
import UTIF from 'utif';

type ImageFormat = 'png' | 'jpeg' | 'webp' | 'bmp';

export default function ImageConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<ImageFormat>('png');
  const [resizePercentage, setResizePercentage] = useState(100);
  const [quality, setQuality] = useState(0.95);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const preprocessFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'heic' || fileExtension === 'heif') {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/png',
      });
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return URL.createObjectURL(blob);
    }

    if (fileExtension === 'tiff' || fileExtension === 'tif') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const ifds = UTIF.decode(arrayBuffer);
            UTIF.decodeImage(arrayBuffer, ifds[0]);
            const rgba = UTIF.toRGBA8(ifds[0]);

            const canvas = document.createElement('canvas');
            canvas.width = ifds[0].width;
            canvas.height = ifds[0].height;
            const ctx = canvas.getContext('2d')!;
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            imageData.data.set(rgba);
            ctx.putImageData(imageData, 0, 0);

            resolve(canvas.toDataURL('image/png'));
          } catch (error) {
            reject(new Error('Failed to decode TIFF image'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read TIFF file'));
        reader.readAsArrayBuffer(file);
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const convertImage = async (file: File): Promise<{ blob: Blob; filename: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();
        const dataUrl = await preprocessFile(file);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          const newWidth = Math.round(img.width * (resizePercentage / 100));
          const newHeight = Math.round(img.height * (resizePercentage / 100));

          canvas.width = newWidth;
          canvas.height = newHeight;

          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const filename = `${originalName}.${outputFormat}`;
                resolve({ blob, filename });
              } else {
                reject(new Error('Failed to convert image'));
              }
            },
            `image/${outputFormat}`,
            quality
          );

          if (dataUrl.startsWith('blob:')) {
            URL.revokeObjectURL(dataUrl);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setConverting(true);
    setProgress('Converting images...');

    try {
      if (files.length === 1) {
        const { blob, filename } = await convertImage(files[0]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('Conversion complete!');
      } else {
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          setProgress(`Converting image ${i + 1} of ${files.length}...`);
          const { blob, filename } = await convertImage(files[i]);
          zip.file(filename, blob);
        }

        setProgress('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('All images converted!');
      }
    } catch (error) {
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <FileImage className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Image Converter</h2>
          <p className="text-slate-600">Convert images between formats with optional resizing (supports JPEG, PNG, GIF, TIFF, HEIC, WebP, BMP)</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload Images
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 flex flex-col items-center px-4 py-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-600">
                {files.length === 0 ? 'Click to upload images' : `${files.length} file(s) selected`}
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.heic,.heif,.tiff,.tif"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as ImageFormat)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="bmp">BMP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resize ({resizePercentage}%)
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={resizePercentage}
              onChange={(e) => setResizePercentage(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>
        </div>

        {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quality ({Math.round(quality * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        <button
          onClick={handleConvert}
          disabled={files.length === 0 || converting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          {converting ? 'Converting...' : 'Convert & Download'}
        </button>

        {progress && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
