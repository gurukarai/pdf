import React, { useState, useCallback } from 'react';
import { FileText, Settings, Zap } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { BookWrapperSettings, StatusMessage as StatusMessageType } from '../types';
import { processBookWrapper, processBookWrapperImages, processCanvasWrapper } from '../utils/pdfUtils';
import { BOOK_PAGE_SIZES, OUTPUT_PAPER_SIZES } from '../constants';
import BookCoverCompositor from './BookCoverCompositor';

const BookWrapper: React.FC = () => {
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
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const [isCompositorMode, setIsCompositorMode] = useState(false);
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

  const handleTemplateChange = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      setTemplateFile(files[0]);
      setStatus(null);
      setDownloadUrl('');
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

    if (isCanvasMode && !templateFile) {
      setStatus({ message: 'Please upload a template image for Canvas Wrapper mode.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      let result;

      if (isCanvasMode && templateFile) {
        // Process canvas wrapper - one page per PDF
        result = await processCanvasWrapper(templateFile, imageFiles[0], settings, (message) => {
          setStatus({ message, type: 'info' });
        });
      } else {
        // Process book wrapper normally
        result = await processBookWrapperImages(imageFiles, settings, (message) => {
          setStatus({ message, type: 'info' });
        });
      }

      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setStatus({
        message: `✅ Success! ${isCanvasMode ? 'Canvas wrapper' : 'Book wrapper'} applied successfully.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Wrapper processing error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFiles, templateFile, isCanvasMode, settings]);


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

      {/* Shared Settings Section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Wrapper Settings</h3>
        </div>

        {/* Preset Templates */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-semibold text-blue-800 mb-3">Wrapper Settings</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setIsCanvasMode(false);
                setIsCompositorMode(false);
                setSettings({
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
                });
              }}
              className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                !isCanvasMode && !isCompositorMode ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Book Wrapper
            </button>
            <button
              onClick={() => {
                setIsCanvasMode(false);
                setIsCompositorMode(false);
                setSettings({
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
                });
              }}
              className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                !isCanvasMode && !isCompositorMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Blue Binding Wrapper
            </button>
            <button
              onClick={() => {
                setIsCanvasMode(true);
                setIsCompositorMode(false);
                setSettings({
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
                });
              }}
              className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                isCanvasMode && !isCompositorMode ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Canvas Wrapper
            </button>
            <button
              onClick={() => {
                setIsCanvasMode(false);
                setIsCompositorMode(true);
              }}
              className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                isCompositorMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Canvas Compositor
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-blue-700">
            <p><strong>Book Wrapper:</strong> A4 (210×297mm) right-aligned on 13×19" landscape with spine — 15mm right, 16mm top/bottom, 257mm left margin</p>
            <p><strong>Blue Binding Wrapper:</strong> A4 on 560×300mm — left binding margin (280mm left, 10mm top)</p>
            <p><strong>Canvas Wrapper:</strong> Places PDF first page as transparent on 13×19" template</p>
            <p><strong>Canvas Compositor:</strong> Compose PDF covers onto a selectable landscape print canvas at 300 DPI</p>
          </div>
        </div>
      </div>

      {/* Canvas Compositor sub-mode */}
      {isCompositorMode && (
        <BookCoverCompositor />
      )}

      {!isCompositorMode && <div className="bg-gray-50 p-6 rounded-lg">
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
      </div>}

      {/* Template Upload - Only for Canvas Wrapper */}
      {!isCompositorMode && isCanvasMode && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <FileUpload
            id="templateImageInput"
            accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
            multiple={false}
            onFileChange={handleTemplateChange}
            label="Upload Template Image (13×19)"
            description="Upload the background template image for canvas wrapper"
            fileCount={templateFile ? templateFile.name : 'No template selected'}
          />
        </div>
      )}

      {/* File Upload */}
      {!isCompositorMode && (
        <FileUpload
          id="bookWrapperImageInput"
          accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png,application/pdf,.pdf"
          multiple
          onFileChange={handleFileChange}
          label={isCanvasMode ? "Upload PDFs" : "Upload Images or PDFs"}
          description={isCanvasMode ? "Upload PDF files. First page of each PDF will be placed on the template." : "Drag & Drop or Click to Select — JPG, PNG, PDF supported. For multi-page PDFs, only the first page is used."}
          fileCount={getFileDisplay()}
        />
      )}

      {/* Process Button */}
      {!isCompositorMode && (
        <button
          onClick={processWrapper}
          disabled={isProcessing || imageFiles.length === 0 || (isCanvasMode && !templateFile)}
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
              {isCanvasMode ? 'Generate Canvas Wrapper' : 'Apply Wrapper'}
            </span>
          )}
        </button>
      )}

      {/* Status Message */}
      {!isCompositorMode && <StatusMessage status={status} isProcessing={isProcessing} />}

      {/* Download Link */}
      {!isCompositorMode && downloadUrl && (
        <div className="text-center">
          <DownloadButton
            href={downloadUrl}
            filename={downloadFilename}
          >
            Download Wrapped Images PDF
          </DownloadButton>
        </div>
      )}
    </div>
  );
};

export default BookWrapper;