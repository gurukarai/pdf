import React, { useState, useCallback } from 'react';
import { FileText, Settings, Zap, Image as ImageIcon } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { BookWrapperSettings, StatusMessage as StatusMessageType } from '../types';
import { processBookWrapper, processBookWrapperImages, processCanvasWrapper } from '../utils/pdfUtils';
import { BOOK_PAGE_SIZES, OUTPUT_PAPER_SIZES } from '../constants';

type WrapperMode = 'book-wrapper' | 'canvas-wrapper';

const BookWrapper: React.FC = () => {
  const [mode, setMode] = useState<WrapperMode>('book-wrapper');
  const [settings, setSettings] = useState<BookWrapperSettings>({
    bookPageSize: 'a5',
    outputPaperSize: 'a3',
    unit: 'mm',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    centerHorizontally: true,
    centerVertically: true
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [previewPdfIndex, setPreviewPdfIndex] = useState(0);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setImageFiles(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handleBackgroundChange = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      setBackgroundFile(files[0]);
      setStatus(null);
      setDownloadUrl('');
    }
  }, []);

  const handlePdfFilesChange = useCallback((files: FileList | null) => {
    if (files) {
      setPdfFiles(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
      setPreviewPdfIndex(0);
    }
  }, []);

  const handleSettingChange = useCallback((key: keyof BookWrapperSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleUnitChange = useCallback((newUnit: 'mm' | 'cm' | 'in') => {
    // Convert existing values to new unit
    const convertValue = (value: number, fromUnit: 'mm' | 'cm' | 'in', toUnit: 'mm' | 'cm' | 'in'): number => {
      // First convert to mm
      let mmValue = value;
      if (fromUnit === 'cm') mmValue = value * 10;
      else if (fromUnit === 'in') mmValue = value * 25.4;
      
      // Then convert from mm to target unit
      if (toUnit === 'cm') return mmValue / 10;
      else if (toUnit === 'in') return mmValue / 25.4;
      return mmValue;
    };

    setSettings(prev => ({
      ...prev,
      unit: newUnit,
      marginTop: Math.round(convertValue(prev.marginTop, prev.unit, newUnit) * 100) / 100,
      marginBottom: Math.round(convertValue(prev.marginBottom, prev.unit, newUnit) * 100) / 100,
      marginLeft: Math.round(convertValue(prev.marginLeft, prev.unit, newUnit) * 100) / 100,
      marginRight: Math.round(convertValue(prev.marginRight, prev.unit, newUnit) * 100) / 100,
      customBookWidth: prev.customBookWidth ? Math.round(convertValue(prev.customBookWidth, prev.unit, newUnit) * 100) / 100 : undefined,
      customBookHeight: prev.customBookHeight ? Math.round(convertValue(prev.customBookHeight, prev.unit, newUnit) * 100) / 100 : undefined,
      customOutputWidth: prev.customOutputWidth ? Math.round(convertValue(prev.customOutputWidth, prev.unit, newUnit) * 100) / 100 : undefined,
      customOutputHeight: prev.customOutputHeight ? Math.round(convertValue(prev.customOutputHeight, prev.unit, newUnit) * 100) / 100 : undefined
    }));
  }, []);

  const processWrapper = useCallback(async () => {
    if (imageFiles.length === 0) {
      setStatus({ message: 'Please select images or PDFs to process.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const result = await processBookWrapperImages(imageFiles, settings, (message) => {
        setStatus({ message, type: 'info' });
      });

      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setStatus({
        message: `✅ Success! Book wrapper applied successfully.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Book wrapper processing error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFiles, settings]);

  const processCanvas = useCallback(async () => {
    if (!backgroundFile || pdfFiles.length === 0) {
      setStatus({ message: 'Please select background image and a PDF file.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const result = await processCanvasWrapper(backgroundFile, pdfFiles[0], settings, (message) => {
        setStatus({ message, type: 'info' });
      });

      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setStatus({
        message: `✅ Success! Canvas wrapper generated successfully.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Canvas wrapper processing error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [backgroundFile, pdfFiles, settings]);

  const getFileDisplay = () => {
    if (imageFiles.length === 0) return 'No files selected';
    if (imageFiles.length === 1) return imageFiles[0].name;
    return `${imageFiles.length} files selected`;
  };

  const getUnitLabel = (baseLabel: string) => {
    return `${baseLabel} (${settings.unit})`;
  };

  const getStepValue = () => {
    switch (settings.unit) {
      case 'in': return '0.01';
      case 'cm': return '0.1';
      default: return '1';
    }
  };

  const getAutoLeftMargin = (): string => {
    if (!settings.enableSpine || !settings.spineWidth) return '—';
    const toMm = (v: number) => {
      if (settings.unit === 'cm') return v * 10;
      if (settings.unit === 'in') return v * 25.4;
      return v;
    };
    const fromMm = (v: number) => {
      if (settings.unit === 'cm') return v / 10;
      if (settings.unit === 'in') return v / 25.4;
      return v;
    };
    const paperWidthsMm: Record<string, number> = {
      'a3': 420, 'a4': 297, 'letter': 11 * 25.4, 'legal': 14 * 25.4,
      'tabloid': 17 * 25.4, '12x18': 18 * 25.4, '13x19': 19 * 25.4
    };
    const outputWidthMm = settings.outputPaperSize === 'custom'
      ? Math.max(toMm(settings.customOutputWidth || 420), toMm(settings.customOutputHeight || 297))
      : (paperWidthsMm[settings.outputPaperSize] ?? 420);
    const spineHalfMm = toMm(settings.spineWidth) / 2;
    const centerMm = outputWidthMm / 2;
    const spineRightMm = centerMm + spineHalfMm;
    const overlapMm = toMm(settings.spineOverlap ?? 3);
    const autoLeftMm = spineRightMm - overlapMm;
    return `${Math.round(fromMm(autoLeftMm) * 100) / 100} ${settings.unit} (auto)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Book Wrapper</h2>
      </div>

      {/* Mode Selection Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 flex gap-2">
        <button
          onClick={() => setMode('book-wrapper')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
            mode === 'book-wrapper'
              ? 'bg-orange-600 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-5 h-5" />
          Book Wrapper
        </button>
        <button
          onClick={() => setMode('canvas-wrapper')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
            mode === 'canvas-wrapper'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ImageIcon className="w-5 h-5" />
          Canvas Wrapper
        </button>
      </div>

      {/* Canvas Wrapper Content */}
      {mode === 'canvas-wrapper' && (
        <>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Canvas Wrapper - Upload Files</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a background image and a PDF file. The PDF pages will be placed on the background using the same margin and centering settings as Book Wrapper mode.
            </p>

            <div className="space-y-4">
            <FileUpload
              id="canvasBackgroundInput"
              accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
              multiple={false}
              onFileChange={handleBackgroundChange}
              label="Background Image (13 × 19 in)"
              description="Upload the background image for the canvas"
              fileCount={backgroundFile ? backgroundFile.name : 'No file selected'}
            />

            <FileUpload
              id="canvasPdfInput"
              accept="application/pdf,.pdf"
              multiple={true}
              onFileChange={handlePdfFilesChange}
              label="PDF Cover Files"
              description="Upload one or more PDF files. First page of each PDF will be used."
              fileCount={pdfFiles.length === 0 ? 'No files selected' : pdfFiles.length === 1 ? pdfFiles[0].name : `${pdfFiles.length} files selected`}
            />
          </div>

          {/* Process Button for Canvas */}
          <button
            onClick={processCanvas}
            disabled={isProcessing || !backgroundFile || pdfFiles.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Generate Canvas Wrapper PDF
              </span>
            )}
          </button>

          {/* Status and Download for Canvas */}
          <StatusMessage status={status} isProcessing={isProcessing} />
          {downloadUrl && (
            <div className="text-center">
              <DownloadButton href={downloadUrl} filename={downloadFilename}>
                Download Canvas Wrapper PDF
              </DownloadButton>
            </div>
          )}
          </div>
        </>
      )}

      {/* Shared Settings Section - Used by both Book Wrapper and Canvas Wrapper */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Wrapper Settings</h3>
        </div>
        
        {/* Preset Templates */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-semibold text-blue-800 mb-3">Preset Templates</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSettings({
                bookPageSize: 'a4',
                outputPaperSize: 'custom',
                customOutputWidth: 560,
                customOutputHeight: 300,
                unit: 'mm',
                marginTop: 10,
                marginBottom: 0,
                marginLeft: 280,
                marginRight: 0,
                centerHorizontally: false,
                centerVertically: false
              })}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              Blue Binding Wrapper
            </button>
            <button
              onClick={() => setSettings({
                bookPageSize: 'a4',
                outputPaperSize: 'custom',
                customOutputWidth: 482.6,
                customOutputHeight: 330.2,
                unit: 'mm',
                marginTop: 16,
                marginBottom: 16,
                marginLeft: 257,
                marginRight: 15,
                centerHorizontally: false,
                centerVertically: false,
                enableSpine: true,
                spineWidth: 10,
                spineTickLength: 5,
                spineOverlap: 3,
              })}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors duration-200 text-sm font-medium"
            >
              A4 Book Wrapper (13×19)
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-blue-700">
            <p><strong>Blue Binding Wrapper:</strong> A4 on 560×300mm — left binding margin (280mm left, 10mm top)</p>
            <p><strong>A4 Book Wrapper (13×19):</strong> A4 (210×297mm) right-aligned on 13×19" landscape — 15mm right, 16mm top/bottom, 257mm left margin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Unit Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={settings.unit}
              onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'cm' | 'in')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="mm">Millimeters (mm)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="in">Inches (in)</option>
            </select>
          </div>

          {/* Book Page Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Page Size</label>
            <select
              value={settings.bookPageSize}
              onChange={(e) => handleSettingChange('bookPageSize', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="a4">A4 (210×297mm)</option>
              <option value="a5">A5 (148×210mm)</option>
              <option value="a6">A6 (105×148mm)</option>
              <option value="letter">Letter (8.5×11in)</option>
              <option value="half-letter">Half Letter (5.5×8.5in)</option>
              <option value="custom">Custom Size</option>
            </select>
          </div>

          {/* Output Paper Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Paper Size</label>
            <select
              value={settings.outputPaperSize}
              onChange={(e) => handleSettingChange('outputPaperSize', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="a3">A3 (297×420mm)</option>
              <option value="a4">A4 (210×297mm)</option>
              <option value="letter">Letter (8.5×11in)</option>
              <option value="legal">Legal (8.5×14in)</option>
              <option value="tabloid">Tabloid (11×17in)</option>
              <option value="12x18">12×18 inches</option>
              <option value="13x19">13×19 inches</option>
              <option value="custom">Custom Size</option>
            </select>
          </div>

          {/* Custom Book Size Inputs */}
          {settings.bookPageSize === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Book Width')}</label>
                <input
                  type="number"
                  step={getStepValue()}
                  value={settings.customBookWidth || ''}
                  onChange={(e) => handleSettingChange('customBookWidth', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Book Height')}</label>
                <input
                  type="number"
                  step={getStepValue()}
                  value={settings.customBookHeight || ''}
                  onChange={(e) => handleSettingChange('customBookHeight', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          )}

          {/* Custom Output Size Inputs */}
          {settings.outputPaperSize === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Output Width')}</label>
                <input
                  type="number"
                  step={getStepValue()}
                  value={settings.customOutputWidth || ''}
                  onChange={(e) => handleSettingChange('customOutputWidth', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Output Height')}</label>
                <input
                  type="number"
                  step={getStepValue()}
                  value={settings.customOutputHeight || ''}
                  onChange={(e) => handleSettingChange('customOutputHeight', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Margins */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Margins</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Top')}</label>
              <input
                type="number"
                step={getStepValue()}
                value={settings.marginTop}
                onChange={(e) => handleSettingChange('marginTop', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Bottom')}</label>
              <input
                type="number"
                step={getStepValue()}
                value={settings.marginBottom}
                onChange={(e) => handleSettingChange('marginBottom', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getUnitLabel('Left')}
                {settings.enableSpine && (
                  <span className="ml-1 text-xs font-normal text-emerald-600">(spine-controlled)</span>
                )}
              </label>
              {settings.enableSpine ? (
                <div className="w-full p-2 border border-emerald-300 rounded-md bg-emerald-50 text-sm text-emerald-700 font-medium">
                  {getAutoLeftMargin()}
                </div>
              ) : (
                <input
                  type="number"
                  step={getStepValue()}
                  value={settings.marginLeft}
                  onChange={(e) => handleSettingChange('marginLeft', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              )}
              {settings.enableSpine && (
                <p className="text-xs text-emerald-600 mt-1">
                  Derived from: spine center − spine/2 + spine width − overlap
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Right')}</label>
              <input
                type="number"
                step={getStepValue()}
                value={settings.marginRight}
                onChange={(e) => handleSettingChange('marginRight', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Centering Options */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Positioning</h4>
          <div className="flex flex-wrap gap-4">
            <label className={`flex items-center text-sm ${settings.enableSpine ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={settings.centerHorizontally}
                disabled={!!settings.enableSpine}
                onChange={(e) => handleSettingChange('centerHorizontally', e.target.checked)}
                className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-2 disabled:opacity-40"
              />
              Center Horizontally
              {settings.enableSpine && <span className="ml-1 text-xs">(disabled — spine controls X)</span>}
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.centerVertically}
                onChange={(e) => handleSettingChange('centerVertically', e.target.checked)}
                className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-2"
              />
              Center Vertically
            </label>
          </div>
        </div>

        {/* Spine Settings */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-md font-semibold text-gray-800">Spine</h4>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.enableSpine}
                onChange={(e) => handleSettingChange('enableSpine', e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              Enable spine marks
            </label>
          </div>

          {settings.enableSpine && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-4">
              <p className="text-xs text-emerald-700">
                Spine marks are drawn at the horizontal center of the output sheet. Short tick lines appear at the top and bottom edges to indicate spine width. A dashed overlap line shows where the A4 cover folds over the spine.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spine Width ({settings.unit})
                  </label>
                  <input
                    type="number"
                    step={getStepValue()}
                    min="0"
                    value={settings.spineWidth ?? 10}
                    onChange={(e) => handleSettingChange('spineWidth', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Width of the book spine</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tick Length ({settings.unit})
                  </label>
                  <input
                    type="number"
                    step={getStepValue()}
                    min="0"
                    value={settings.spineTickLength ?? 5}
                    onChange={(e) => handleSettingChange('spineTickLength', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Length of top/bottom tick lines</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Overlap ({settings.unit})
                  </label>
                  <input
                    type="number"
                    step={getStepValue()}
                    min="0"
                    value={settings.spineOverlap ?? 3}
                    onChange={(e) => handleSettingChange('spineOverlap', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">A4 left edge overlap onto spine (dashed guide)</p>
                </div>
              </div>

              {/* Visual diagram */}
              <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-md">
                <p className="text-xs font-semibold text-gray-600 mb-2">Layout preview (not to scale):</p>
                <div className="relative h-16 bg-gray-100 rounded border border-gray-300 overflow-hidden flex items-stretch">
                  {/* Left blank area */}
                  <div className="flex-1 bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400">Left space</span>
                  </div>
                  {/* Spine area */}
                  <div className="relative flex-shrink-0 bg-amber-100 border-l-2 border-r-2 border-amber-500 flex items-center justify-center"
                    style={{ width: `${Math.max(6, (settings.spineWidth ?? 10) * 1.5)}px` }}>
                    <span className="text-xs text-amber-700 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '9px' }}>spine</span>
                    {/* Top tick */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 opacity-60" />
                    {/* Bottom tick */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400 opacity-60" />
                  </div>
                  {/* A4 cover area */}
                  <div className="flex-shrink-0 bg-blue-100 border-l-2 border-dashed border-blue-400 flex items-center justify-center"
                    style={{ width: '120px' }}>
                    <span className="text-xs text-blue-600">A4 cover</span>
                    <div className="absolute" style={{ left: `calc(50% + ${Math.max(6, (settings.spineWidth ?? 10) * 1.5) / 2 + (settings.spineOverlap ?? 3) * 1.5}px)` }}>
                    </div>
                  </div>
                  {/* Right margin */}
                  <div className="flex-shrink-0 bg-gray-100 flex items-center justify-center px-1">
                    <span className="text-xs text-gray-400">15mm</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Supported Formats:</strong> JPG, PNG, and PDF — all in the same batch</li>
            <li>• <strong>PDF Input:</strong> Only the first page of each PDF is used</li>
            <li>• <strong>Automatic Scaling:</strong> Pages are scaled down to fit if necessary (never scaled up)</li>
            <li>• <strong>Flexible Positioning:</strong> Use margins and centering options for precise placement</li>
            <li>• <strong>Multiple Units:</strong> Work in millimeters, centimeters, or inches</li>
            <li>• <strong>Multiple Files:</strong> Each file becomes one page in the output PDF</li>
          </ul>
        </div>
      </div>

      {/* File Upload - Book Wrapper Mode */}
      {mode === 'book-wrapper' && (
        <>
          <FileUpload
        id="bookWrapperImageInput"
        accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png,application/pdf,.pdf"
        multiple
        onFileChange={handleFileChange}
        label="Upload Images or PDFs"
        description="Drag & Drop or Click to Select — JPG, PNG, PDF supported. For multi-page PDFs, only the first page is used."
        fileCount={getFileDisplay()}
      />

      {/* Process Button */}
      <button
        onClick={processWrapper}
        disabled={isProcessing || imageFiles.length === 0}
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            Apply Book Wrapper
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
            Download Wrapped Images PDF
          </DownloadButton>
        </div>
      )}
        </>
      )}
      {/* End of Book Wrapper Mode */}
    </div>
  );
};

export default BookWrapper;