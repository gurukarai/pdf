import React, { useState } from 'react';
import { Upload, Download, Minimize2 } from 'lucide-react';
import JSZip from 'jszip';

export default function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState<'original' | 'jpeg' | 'webp'>('original');
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState('');
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setCompressionStats(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const compressImage = async (file: File): Promise<{ blob: Blob; filename: string; originalSize: number; compressedSize: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let mimeType = file.type;
        let ext = file.name.substring(file.name.lastIndexOf('.'));

        if (outputFormat === 'jpeg') {
          mimeType = 'image/jpeg';
          ext = '.jpg';
        } else if (outputFormat === 'webp') {
          mimeType = 'image/webp';
          ext = '.webp';
        } else if (file.type === 'image/png') {
          mimeType = 'image/png';
        } else if (file.type === 'image/jpeg') {
          mimeType = 'image/jpeg';
        } else {
          mimeType = 'image/jpeg';
          ext = '.jpg';
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const filename = `${originalName}_compressed${ext}`;
              resolve({
                blob,
                filename,
                originalSize: file.size,
                compressedSize: blob.size
              });
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          mimeType,
          quality / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    setCompressing(true);
    setProgress('Compressing images...');

    try {
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      if (files.length === 1) {
        const { blob, filename, originalSize, compressedSize } = await compressImage(files[0]);
        totalOriginalSize = originalSize;
        totalCompressedSize = compressedSize;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('Compression complete!');
      } else {
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          setProgress(`Compressing image ${i + 1} of ${files.length}...`);
          const { blob, filename, originalSize, compressedSize } = await compressImage(files[i]);
          totalOriginalSize += originalSize;
          totalCompressedSize += compressedSize;
          zip.file(filename, blob);
        }

        setProgress('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed-images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('All images compressed!');
      }

      setCompressionStats({
        originalSize: totalOriginalSize,
        compressedSize: totalCompressedSize
      });
    } catch (error) {
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCompressing(false);
    }
  };

  const savings = compressionStats
    ? ((compressionStats.originalSize - compressionStats.compressedSize) / compressionStats.originalSize) * 100
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
          <Minimize2 className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Image Compressor</h2>
          <p className="text-slate-600">Reduce image file size while maintaining quality</p>
        </div>
      </div>

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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="original">Keep Original Format</option>
              <option value="jpeg">JPEG (Best Compression)</option>
              <option value="webp">WebP (Modern Format)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quality: {quality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low (10%)</span>
              <span>Medium (50%)</span>
              <span>High (100%)</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Compression Tips</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• 80-90% quality provides good balance between size and quality</li>
            <li>• JPEG is best for photos, WebP offers better compression</li>
            <li>• Lower quality = smaller file size but reduced image quality</li>
          </ul>
        </div>

        {compressionStats && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-green-800">Compression Results</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Original Size</p>
                <p className="font-semibold text-slate-800">{formatFileSize(compressionStats.originalSize)}</p>
              </div>
              <div>
                <p className="text-slate-600">Compressed Size</p>
                <p className="font-semibold text-slate-800">{formatFileSize(compressionStats.compressedSize)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-green-200">
              <p className="text-green-700 font-semibold">
                Saved {savings.toFixed(1)}% ({formatFileSize(compressionStats.originalSize - compressionStats.compressedSize)})
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleCompress}
          disabled={files.length === 0 || compressing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          {compressing ? 'Compressing...' : 'Compress & Download'}
        </button>

        {progress && !compressionStats && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
