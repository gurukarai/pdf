import React, { useState } from 'react';
import { Upload, Download, Frame } from 'lucide-react';
import JSZip from 'jszip';
import heic2any from 'heic2any';
import UTIF from 'utif';

export default function ImageBorder() {
  const [files, setFiles] = useState<File[]>([]);
  const [borderWidth, setBorderWidth] = useState(20);
  const [borderColor, setBorderColor] = useState('#000000');
  const [processing, setProcessing] = useState(false);
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

  const addBorderToImage = async (file: File): Promise<{ blob: Blob; filename: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();
        const dataUrl = await preprocessFile(file);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          const totalWidth = img.width + (borderWidth * 2);
          const totalHeight = img.height + (borderWidth * 2);

          canvas.width = totalWidth;
          canvas.height = totalHeight;

          ctx.fillStyle = borderColor;
          ctx.fillRect(0, 0, totalWidth, totalHeight);

          ctx.drawImage(img, borderWidth, borderWidth, img.width, img.height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const extension = file.name.split('.').pop() || 'png';
                const filename = `${originalName}_bordered.${extension}`;
                resolve({ blob, filename });
              } else {
                reject(new Error('Failed to add border'));
              }
            },
            `image/${file.type.split('/')[1] || 'png'}`,
            1.0
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

  const handleProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress('Adding borders...');

    try {
      if (files.length === 1) {
        const { blob, filename } = await addBorderToImage(files[0]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('Border added successfully!');
      } else {
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          setProgress(`Processing image ${i + 1} of ${files.length}...`);
          const { blob, filename } = await addBorderToImage(files[i]);
          zip.file(filename, blob);
        }

        setProgress('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bordered-images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress('All borders added!');
      }
    } catch (error) {
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const predefinedColors = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
          <Frame className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Image Border</h2>
          <p className="text-slate-600">Add customizable borders to your images</p>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Border Width ({borderWidth}px)
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={borderWidth}
            onChange={(e) => setBorderWidth(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1px</span>
            <span>50px</span>
            <span>100px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Border Color
          </label>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBorderColor(color.value)}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                    borderColor === color.value
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded border border-slate-300"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs text-slate-700">{color.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-700">Custom Color:</label>
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-16 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleProcess}
          disabled={files.length === 0 || processing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          {processing ? 'Processing...' : 'Add Border & Download'}
        </button>

        {progress && (
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-sm text-pink-800">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
