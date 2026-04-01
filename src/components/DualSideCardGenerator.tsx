import React, { useState, useCallback } from 'react';
import { CreditCard, Settings } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { StatusMessage as StatusMessageType } from '../types';
import { generateDualSideCards } from '../utils/dualSideCardUtils';

const DualSideCardGenerator: React.FC = () => {
  const [cardOrientation, setCardOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [frontShift, setFrontShift] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [backShift, setBackShift] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [frontImages, setFrontImages] = useState<File[]>([]);
  const [backImages, setBackImages] = useState<File[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const handleFrontFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setFrontImages(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handleBackFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setBackImages(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handleFrontShiftChange = useCallback((direction: 'top' | 'bottom' | 'left' | 'right', value: number) => {
    setFrontShift(prev => ({ ...prev, [direction]: value }));
  }, []);

  const handleBackShiftChange = useCallback((direction: 'top' | 'bottom' | 'left' | 'right', value: number) => {
    setBackShift(prev => ({ ...prev, [direction]: value }));
  }, []);
  const generateCards = useCallback(async () => {
    if (frontImages.length === 0 || backImages.length === 0) {
      setStatus({ message: 'Please select both front and back images.', type: 'error' });
      return;
    }

    if (frontImages.length !== backImages.length) {
      setStatus({ message: 'The number of front images must match the number of back images.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const blob = await generateDualSideCards(frontImages, backImages, {
        orientation: cardOrientation,
        frontShift,
        backShift
      }, (message) => {
        setStatus({ message, type: 'info' });
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({
        message: `✅ Successfully generated dual-side ID cards PDF with ${frontImages.length} card pairs!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Dual-side card generation error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [frontImages, backImages, cardOrientation, frontShift, backShift]);

  const getFrontFileCountDisplay = () => {
    if (frontImages.length === 0) return '0 files selected';
    if (frontImages.length === 1) return frontImages[0].name;
    return `${frontImages.length} files selected`;
  };

  const getBackFileCountDisplay = () => {
    if (backImages.length === 0) return '0 files selected';
    if (backImages.length === 1) return backImages[0].name;
    return `${backImages.length} files selected`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <CreditCard className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Dual-Side ID Card Generator</h2>
      </div>

      {/* Settings Info */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Card Specifications</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-md">
            <div className="font-medium text-gray-700">Card Size</div>
            <div className="text-gray-600">87mm × 55mm</div>
          </div>
          <div className="bg-white p-3 rounded-md">
            <div className="font-medium text-gray-700">Paper Size</div>
            <div className="text-gray-600">A4 (210mm × 297mm)</div>
          </div>
          <div className="bg-white p-3 rounded-md">
            <div className="font-medium text-gray-700">Cards per Sheet</div>
            <div className="text-gray-600">10 cards (2×5 grid)</div>
          </div>
          <div className="bg-white p-3 rounded-md">
            <div className="font-medium text-gray-700">Gap Between Cards</div>
            <div className="text-gray-600">2mm</div>
          </div>
        </div>

        {/* Card Orientation */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Card Orientation</h4>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="orientation"
                value="horizontal"
                checked={cardOrientation === 'horizontal'}
                onChange={(e) => setCardOrientation(e.target.value as 'horizontal' | 'vertical')}
                className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Horizontal (Standard)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="orientation"
                value="vertical"
                checked={cardOrientation === 'vertical'}
                onChange={(e) => setCardOrientation(e.target.value as 'horizontal' | 'vertical')}
                className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Vertical (Rotated)</span>
            </label>
          </div>
          {cardOrientation === 'vertical' && (
            <p className="mt-2 text-sm text-gray-600">
              Front images rotated 90° counter-clockwise, back images rotated 90° clockwise
            </p>
          )}
        </div>

        {/* Image Shifting Controls */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Image Position Adjustment (mm)</h4>
          <p className="text-sm text-gray-600 mb-4">Fine-tune image positioning to compensate for printer accuracy issues</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Front Image Shifts */}
            <div className="bg-white p-4 rounded-lg border">
              <h5 className="text-sm font-semibold text-gray-700 mb-3">Front Image Shifts</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Up (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={frontShift.top}
                    onChange={(e) => handleFrontShiftChange('top', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Down (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={frontShift.bottom}
                    onChange={(e) => handleFrontShiftChange('bottom', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Left (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={frontShift.left}
                    onChange={(e) => handleFrontShiftChange('left', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Right (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={frontShift.right}
                    onChange={(e) => handleFrontShiftChange('right', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Back Image Shifts */}
            <div className="bg-white p-4 rounded-lg border">
              <h5 className="text-sm font-semibold text-gray-700 mb-3">Back Image Shifts</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Up (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={backShift.top}
                    onChange={(e) => handleBackShiftChange('top', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Down (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={backShift.bottom}
                    onChange={(e) => handleBackShiftChange('bottom', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Left (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={backShift.left}
                    onChange={(e) => handleBackShiftChange('left', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Right (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={backShift.right}
                    onChange={(e) => handleBackShiftChange('right', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload matching front and back images (same quantity)</li>
            <li>• Images are automatically sorted numerically by filename</li>
            <li>• Choose horizontal or vertical orientation (vertical rotates images)</li>
            <li>• Adjust image positions to compensate for printer misalignment</li>
            <li>• Front and back sheets are generated with crop marks</li>
            <li>• Back images are horizontally flipped for proper alignment when printed</li>
            <li>• Perfect for ID cards, business cards, or any dual-sided cards</li>
          </ul>
        </div>
      </div>

      {/* File Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUpload
          id="frontImageInput"
          accept="image/*"
          multiple
          onFileChange={handleFrontFileChange}
          label="Upload Front Images"
          description="Drag & Drop or Click to Select"
          fileCount={getFrontFileCountDisplay()}
        />

        <FileUpload
          id="backImageInput"
          accept="image/*"
          multiple
          onFileChange={handleBackFileChange}
          label="Upload Back Images"
          description="Drag & Drop or Click to Select"
          fileCount={getBackFileCountDisplay()}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generateCards}
        disabled={isProcessing || frontImages.length === 0 || backImages.length === 0}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            🚀 Generate Dual-Side Cards
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
            filename="dual_side_cards.pdf"
          >
            Download Dual-Side Cards PDF
          </DownloadButton>
        </div>
      )}
    </div>
  );
};

export default DualSideCardGenerator;