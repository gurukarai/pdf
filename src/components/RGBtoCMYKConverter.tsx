import React, { useState } from 'react';
import { Download, Upload, Info } from 'lucide-react';
import { exportCMYKAsJPG, exportCMYKAsPDF } from '../utils/cmykUtils';

type OutputFormat = 'jpg' | 'pdf';

export default function RGBtoCMYKConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg');
  const [quality, setQuality] = useState(95);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);

    selectedFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [file.name]: url }));
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setConverting(true);

    try {
      for (const file of files) {
        const onProgress = (prog: number) => {
          setProgress(prev => ({ ...prev, [file.name]: prog }));
        };

        let blob: Blob;
        let fileName: string;

        if (outputFormat === 'jpg') {
          blob = await exportCMYKAsJPG(file, quality / 100, onProgress);
          fileName = file.name.replace(/\.[^/.]+$/, '_CMYK.jpg');
        } else {
          blob = await exportCMYKAsPDF(file, onProgress);
          fileName = file.name.replace(/\.[^/.]+$/, '_CMYK.pdf');
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setProgress(prev => ({ ...prev, [file.name]: 100 }));
      }
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Error converting images. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleReset = () => {
    files.forEach(file => {
      if (previews[file.name]) {
        URL.revokeObjectURL(previews[file.name]);
      }
    });
    setFiles([]);
    setPreviews({});
    setProgress({});
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">RGB to CMYK Converter</p>
          <p className="text-blue-700">
            Converts RGB images to CMYK color space using US Web Coated SWOP v2 profile approximation.
            Perfect for preparing images for professional printing.
          </p>
          <p className="text-blue-700 mt-2">
            <strong>PDF:</strong> Creates true CMYK colorspace (DeviceCMYK). <strong>JPG:</strong> RGB with CMYK color simulation.
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="cmyk-file-input"
        />
        <label htmlFor="cmyk-file-input" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Upload RGB Images
          </p>
          <p className="text-sm text-gray-500">
            Click to select images or drag and drop
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supports: JPG, PNG, WebP, and other image formats
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.name} className="relative">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {previews[file.name] && (
                    <img
                      src={previews[file.name]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2 truncate" title={file.name}>
                  {file.name}
                </p>
                {progress[file.name] !== undefined && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress[file.name]}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {progress[file.name]}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="jpg"
                    checked={outputFormat === 'jpg'}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">JPG</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pdf"
                    checked={outputFormat === 'pdf'}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">PDF</span>
                </label>
              </div>
            </div>

            {outputFormat === 'jpg' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                {converting ? 'Converting...' : 'Convert & Download'}
              </button>
              <button
                onClick={handleReset}
                disabled={converting}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2 text-sm">About CMYK Conversion</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Converts RGB color space to CMYK for professional printing</li>
          <li>• Uses US Web Coated SWOP v2 profile approximation</li>
          <li>• Colors may appear slightly different from RGB originals</li>
          <li>• Recommended for offset printing and professional print services</li>
          <li>• <strong>PDF format creates true CMYK colorspace (DeviceCMYK)</strong> - verify with pdfimages tool</li>
          <li>• JPG format shows CMYK color appearance but remains in RGB colorspace (browser limitation)</li>
        </ul>
      </div>
    </div>
  );
}
