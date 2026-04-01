import React, { useState, useCallback } from 'react';
import { FileText, Settings, Zap } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { PdfManipulationSettings, StatusMessage as StatusMessageType } from '../types';
import { processPdfManipulation } from '../utils/pdfUtils';
import { PAGE_NUMBER_POSITIONS, FONTS } from '../constants';

const BookPrint: React.FC = () => {
  const [settings, setSettings] = useState<PdfManipulationSettings>({
    mode: '2up-landscape',
    paperSize: 'letter',
    borderThickness: 0,
    margins: {
      top: 0.5,
      bottom: 0.5,
      left: 0,
      right: -2
    },
    evenMargins: {
      top: 0.5,
      bottom: 0.5,
      left: 0,
      right: -2
    },
    drawFrame: false,
    pageNumberSettings: {
      position: 'bottom-center',
      fontSize: 12,
      font: 'Helvetica',
      startNumber: 1,
      format: '{page}',
      adjustX: 0,
      adjustY: 0,
      useCustomPosition: false,
      customX: 10,
      customY: 10
    }
  });

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setPdfFiles(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handleModeChange = useCallback((mode: string) => {
    setSettings(prev => ({ ...prev, mode }));
    setPdfFiles([]);
    setStatus(null);
    setDownloadUrl('');
  }, []);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const processPDF = useCallback(async () => {
    if (pdfFiles.length === 0) {
      setStatus({ message: 'Please select a PDF file to process.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const result = await processPdfManipulation(pdfFiles, settings, (message) => {
        setStatus({ message, type: 'info' });
      });

      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setStatus({
        message: `✅ Success! PDF processed successfully.`,
        type: 'success'
      });
    } catch (error) {
      console.error('PDF processing error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFiles, settings]);

  const getFileCountDisplay = () => {
    if (pdfFiles.length === 0) return 'No files selected';
    if (pdfFiles.length === 1) return `Selected: ${pdfFiles[0].name}`;
    return `${pdfFiles.length} files selected`;
  };

  const renderModeSpecificControls = () => {
    switch (settings.mode) {
      case 'add-margins':
        return (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Margin Settings</h4>
            <p className="text-sm text-gray-600">Enter values in cm. Use negative to add margin (shrink content), positive to trim (crop content).</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Top Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.top || 0.5}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, top: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bottom Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.bottom || 0.5}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, bottom: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Left Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.left || 0}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, left: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Right Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.right || -2}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, right: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
            
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.drawFrame || false}
                onChange={(e) => handleSettingChange('drawFrame', e.target.checked)}
                className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 mr-2"
              />
              Draw Frame (to visualize trim)
            </label>
          </div>
        );
      
      case 'add-page-numbers':
        return (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Page Number Settings</h4>
            
            {/* Position Mode Toggle */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="position-mode"
                  checked={!settings.pageNumberSettings?.useCustomPosition}
                  onChange={() => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, useCustomPosition: false })}
                  className="h-4 w-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Use Preset Position</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="position-mode"
                  checked={settings.pageNumberSettings?.useCustomPosition || false}
                  onChange={() => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, useCustomPosition: true })}
                  className="h-4 w-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Use Custom X/Y Position (mm)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!settings.pageNumberSettings?.useCustomPosition ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={settings.pageNumberSettings?.position || 'bottom-center'}
                    onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, position: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                  >
                    {PAGE_NUMBER_POSITIONS.map(pos => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">X Position (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.pageNumberSettings?.customX || 10}
                      onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, customX: parseFloat(e.target.value) })}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Y Position (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.pageNumberSettings?.customY || 10}
                      onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, customY: parseFloat(e.target.value) })}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={settings.pageNumberSettings?.fontSize || 12}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, fontSize: parseInt(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                <select
                  value={settings.pageNumberSettings?.font || 'Helvetica'}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, font: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                >
                  {FONTS.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Number</label>
                <input
                  type="number"
                  min="1"
                  value={settings.pageNumberSettings?.startNumber || 1}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, startNumber: parseInt(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <input
                  type="text"
                  value={settings.pageNumberSettings?.format || '{page}'}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, format: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
                <p className="mt-1 text-xs text-gray-500">Use {'{page}'} for current page and {'{total}'} for total pages.</p>
              </div>
            </div>

            {/* Position Guide */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Position Guide:</h5>
              <div className="text-sm text-blue-700 space-y-1">
                {settings.pageNumberSettings?.useCustomPosition ? (
                  <>
                    <p>• <strong>X Position:</strong> Distance from left edge of page (0 = left edge)</p>
                    <p>• <strong>Y Position:</strong> Distance from bottom edge of page (0 = bottom edge)</p>
                    <p>• Coordinates are measured in millimeters for precise control</p>
                  </>
                ) : (
                  <>
                    <p>• <strong>Preset positions</strong> automatically place numbers at common locations</p>
                    <p>• Use <strong>Custom X/Y Position</strong> for precise millimeter-level control</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Output Settings</h4>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Paper Size</label>
              <select
                value={settings.paperSize}
                onChange={(e) => handleSettingChange('paperSize', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="a3">A3 (420×297mm)</option>
                <option value="a4">A4 (297×210mm)</option>
                <option value="a5">A5 (210×148mm)</option>
                <option value="a6">A6 (148×105mm)</option>
                <option value="b3">B3 (500×353mm)</option>
                <option value="b4">B4 (353×250mm)</option>
                <option value="b5">B5 (250×176mm)</option>
                <option value="b6">B6 (176×125mm)</option>
                <option value="letter">Letter (11 x 8.5 in)</option>
                <option value="legal">Legal (14 x 8.5 in)</option>
                <option value="8.5x14">Legal Alt (8.5×14 in)</option>
                <option value="tabloid">Tabloid (17 x 11 in)</option>
                <option value="11x17">Ledger (11×17 in)</option>
                <option value="9x12">Arch A (9×12 in)</option>
                <option value="12x18">Arch B (12×18 in)</option>
                <option value="13x19">Super B (13×19 in)</option>
                <option value="16x20">16×20 in</option>
                <option value="18x24">Arch C (18×24 in)</option>
                <option value="24x36">Arch D (24×36 in)</option>
              </select>
              
              {(settings.mode === '2up-landscape' || settings.mode === '4up-portrait') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Border Thickness (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={settings.borderThickness || 0}
                    onChange={(e) => handleSettingChange('borderThickness', parseFloat(e.target.value))}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Controls white border around duplicated pages. 0% = no border, 5% = standard border.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-violet-100 rounded-lg">
          <FileText className="w-6 h-6 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Book Print Tools</h2>
      </div>

      {/* Operation Mode Selection */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Book Print Mode</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { value: '2up-landscape', label: '2-Up (Duplicate)', desc: 'Duplicate each page side by side' },
            { value: '4up-portrait', label: '4-Up (Duplicate)', desc: 'Duplicate each page 4 times per sheet' },
            { value: 'booklet-saddlestitch', label: 'Booklet (Saddle Stitch)', desc: 'Create booklet with proper page order' },
            { value: '2up-cut-stack', label: '2-Up (Cut & Stack)', desc: 'Two-up layout for cutting and stacking' },
            { value: 'add-margins', label: 'Add Margins', desc: 'Add margins or trim pages' },
            { value: 'add-page-numbers', label: 'Add Page Numbers', desc: 'Add page numbers to PDF' }
          ].map(mode => (
            <label
              key={mode.value}
              className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                settings.mode === mode.value
                  ? 'border-violet-500 bg-violet-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="layout-mode"
                value={mode.value}
                checked={settings.mode === mode.value}
                onChange={(e) => handleModeChange(e.target.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-gray-800 mb-1">{mode.label}</span>
              <span className="text-xs text-gray-600">{mode.desc}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Book Print Features:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>2-Up/4-Up:</strong> Duplicate pages for efficient printing</li>
            <li>• <strong>Booklet:</strong> Automatic page ordering for saddle-stitched binding</li>
            <li>• <strong>Cut & Stack:</strong> Optimized layout for cutting and stacking workflow</li>
            <li>• <strong>Margins:</strong> Add binding margins or trim excess space</li>
            <li>• <strong>Page Numbers:</strong> Professional page numbering with custom positioning</li>
          </ul>
        </div>
      </div>

      {/* Mode-specific Controls */}
      {renderModeSpecificControls()}

      {/* File Upload */}
      <FileUpload
        id="bookPrintUpload"
        accept=".pdf"
        multiple={false}
        onFileChange={handleFileChange}
        label="Upload PDF for Book Printing"
        description="Drag & Drop or Click to Select"
        fileCount={getFileCountDisplay()}
      />

      {/* Process Button */}
      <button
        onClick={processPDF}
        disabled={isProcessing || pdfFiles.length === 0}
        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-violet-600 hover:to-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            Process for Book Printing
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
            filename={downloadFilename}
          >
            Download Book Print File
          </DownloadButton>
        </div>
      )}
    </div>
  );
};

export default BookPrint;