import React, { useState, useCallback } from 'react';
import { Scissors, Settings } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { BulkImageSplitterSettings, StatusMessage as StatusMessageType } from '../types';
import { processBulkImageSplitting } from '../utils/imageUtils';

const BulkImageSplitter: React.FC = () => {
  const [settings, setSettings] = useState<BulkImageSplitterSettings>({
    numberOfParts: 2,
    splitPercentage: 50,
    splitDirection: 'horizontal'
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setImageFiles(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handleSettingChange = useCallback((key: keyof BulkImageSplitterSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const splitImages = useCallback(async () => {
    if (imageFiles.length === 0) {
      setStatus({ message: 'Please select images to split.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const blob = await processBulkImageSplitting(imageFiles, settings, (message) => {
        setStatus({ message, type: 'info' });
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({
        message: `✅ Success! Split ${imageFiles.length} image(s) into ${settings.numberOfParts} parts each.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Image splitting error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFiles, settings]);

  const getFileCountDisplay = () => {
    if (imageFiles.length === 0) return '0 files selected';
    if (imageFiles.length === 1) return imageFiles[0].name;
    return `${imageFiles.length} files selected`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Scissors className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Bulk Image Splitter</h2>
      </div>

      {/* Settings */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Split Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Parts (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.numberOfParts}
              onChange={(e) => handleSettingChange('numberOfParts', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Split Percentage (1-99%)</label>
            <input
              type="number"
              min="1"
              max="99"
              value={settings.splitPercentage}
              onChange={(e) => handleSettingChange('splitPercentage', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Split Direction</label>
            <select
              value={settings.splitDirection}
              onChange={(e) => handleSettingChange('splitDirection', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Number of Parts:</strong> How many pieces each image will be split into</li>
            <li>• <strong>Split Percentage:</strong> Where to make the first split (50% = middle)</li>
            <li>• <strong>Direction:</strong> Horizontal splits create top/bottom parts, Vertical creates left/right parts</li>
          </ul>
        </div>
      </div>

      {/* File Upload */}
      <FileUpload
        id="imageSplitterInput"
        accept="image/*"
        multiple
        onFileChange={handleFileChange}
        label="Upload Images to Split"
        description="Drag & Drop or Click to Select"
        fileCount={getFileCountDisplay()}
      />

      {/* Split Button */}
      <button
        onClick={splitImages}
        disabled={isProcessing || imageFiles.length === 0}
        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Scissors className="w-5 h-5" />
            Split Images
          </span>
        )}
      </button>

      {/* Status Message */}
      <StatusMessage status={status} isProcessing={isProcessing} />

      {/* Download Link */}
      {downloadUrl && (
        <div className="text-center">
          <DownloadButton
            href={downloadUrl}
            filename="split-images.zip"
          >
            Download Split Images (ZIP)
          </DownloadButton>
        </div>
      )}
    </div>
  );
};

export default BulkImageSplitter;