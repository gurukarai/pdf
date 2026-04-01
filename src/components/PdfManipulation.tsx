import React, { useState, useCallback } from 'react';
import { FileText, Settings, Zap } from 'lucide-react';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { PdfManipulationSettings, StatusMessage as StatusMessageType } from '../types';
import { processPdfManipulation, countPdfPages, processPdfToImages } from '../utils/pdfUtils';
import { PAGE_NUMBER_POSITIONS, FONTS } from '../constants';

const PdfManipulation: React.FC = () => {
  const [settings, setSettings] = useState<PdfManipulationSettings>({
    mode: '2up-landscape',
    paperSize: 'letter',
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
  const [pageCountResults, setPageCountResults] = useState<Array<{filename: string, pageCount: number}>>([]);
  const [convertedImages, setConvertedImages] = useState<Array<{pageNumber: number, dataUrl: string, blob: Blob}>>([]);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setPdfFiles(Array.from(files));
      setStatus(null);
      setDownloadUrl('');
      setPageCountResults([]);
      setConvertedImages([]);
    }
  }, []);

  const handleModeChange = useCallback((mode: string) => {
    setSettings(prev => ({ ...prev, mode }));
    setPdfFiles([]);
    setStatus(null);
    setDownloadUrl('');
    setPageCountResults([]);
    setConvertedImages([]);
  }, []);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const processPDF = useCallback(async () => {
    if (pdfFiles.length === 0) {
      setStatus({ message: 'Please select a PDF file to process.', type: 'error' });
      return;
    }

    if (settings.mode === 'pdf-page-counter') {
      setIsProcessing(true);
      setStatus(null);
      setDownloadUrl('');
      setPageCountResults([]);

      try {
        const results = await countPdfPages(pdfFiles, (message) => {
          setStatus({ message, type: 'info' });
        });

        setPageCountResults(results);
        const totalPages = results.reduce((sum, result) => sum + result.pageCount, 0);
        setStatus({
          message: `✅ Success! Counted pages in ${results.length} file(s). Total: ${totalPages} pages.`,
          type: 'success'
        });
      } catch (error) {
        console.error('Page counting error:', error);
        setStatus({
          message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (settings.mode === 'pdf-to-image') {
      setIsProcessing(true);
      setStatus(null);
      setDownloadUrl('');
      setConvertedImages([]);

      try {
        const result = await processPdfToImages(pdfFiles[0], settings, (message) => {
          setStatus({ message, type: 'info' });
        });

        if (result.images) {
          setConvertedImages(result.images);
        }

        const url = URL.createObjectURL(result.blob);
        setDownloadUrl(url);
        setDownloadFilename(result.filename);
        setStatus({
          message: `✅ Success! Converted ${result.images?.length || 0} pages to images.`,
          type: 'success'
        });
      } catch (error) {
        console.error('PDF to images conversion error:', error);
        setStatus({
          message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        });
      } finally {
        setIsProcessing(false);
      }
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
      case 'merge-pdf':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Merge Options</h4>
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.mergeSettings?.addBlankOnOdd || false}
                onChange={(e) => handleSettingChange('mergeSettings', { addBlankOnOdd: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              />
              Insert blank page after docs with an odd number of pages
            </label>
          </div>
        );
      
      case 'split-pdf':
        return (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Split Method</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="split-method"
                  value="range"
                  checked={settings.splitSettings?.method === 'range' || !settings.splitSettings?.method}
                  onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, method: e.target.value })}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Extract specific pages</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 1-3, 5, 8-10"
                value={settings.splitSettings?.range || ''}
                onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, range: e.target.value })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="split-method"
                  value="fixed"
                  checked={settings.splitSettings?.method === 'fixed'}
                  onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, method: e.target.value })}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Split every X pages (creates a ZIP)</span>
              </label>
              <input
                type="number"
                min="1"
                value={settings.splitSettings?.fixedPages || 1}
                onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, fixedPages: parseInt(e.target.value) })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="split-method"
                  value="odd"
                  checked={settings.splitSettings?.method === 'odd'}
                  onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, method: e.target.value })}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Extract all odd pages</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="split-method"
                  value="even"
                  checked={settings.splitSettings?.method === 'even'}
                  onChange={(e) => handleSettingChange('splitSettings', { ...settings.splitSettings, method: e.target.value })}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Extract all even pages</span>
              </label>
            </div>
          </div>
        );
      
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
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bottom Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.bottom || 0.5}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, bottom: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Left Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.left || 0}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, left: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Right Trim (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.margins?.right || -2}
                  onChange={(e) => handleSettingChange('margins', { ...settings.margins, right: parseFloat(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.drawFrame || false}
                onChange={(e) => handleSettingChange('drawFrame', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
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
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Use Preset Position</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="position-mode"
                  checked={settings.pageNumberSettings?.useCustomPosition || false}
                  onChange={() => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, useCustomPosition: true })}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Y Position (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.pageNumberSettings?.customY || 10}
                      onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, customY: parseFloat(e.target.value) })}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                <select
                  value={settings.pageNumberSettings?.font || 'Helvetica'}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, font: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <input
                  type="text"
                  value={settings.pageNumberSettings?.format || '{page}'}
                  onChange={(e) => handleSettingChange('pageNumberSettings', { ...settings.pageNumberSettings, format: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
      
      case 'image-to-pdf':
        return (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Image to PDF Settings</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Quality</label>
                <select
                  value={settings.imageSettings?.quality || 'high'}
                  onChange={(e) => handleSettingChange('imageSettings', { ...settings.imageSettings, quality: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="high">High Quality (95%)</option>
                  <option value="medium">Medium Quality (80%)</option>
                  <option value="low">Low Quality (60%)</option>
                  <option value="custom">Custom Quality</option>
                </select>
              </div>
              
              {settings.imageSettings?.quality === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Quality (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.imageSettings?.customQuality || 85}
                    onChange={(e) => handleSettingChange('imageSettings', { ...settings.imageSettings, customQuality: parseInt(e.target.value) })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                <select
                  value={settings.imageSettings?.pageSize || 'auto'}
                  onChange={(e) => handleSettingChange('imageSettings', { ...settings.imageSettings, pageSize: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="auto">Auto (fit to image)</option>
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="letter">Letter (8.5×11in)</option>
                  <option value="legal">Legal (8.5×14in)</option>
                  <option value="a3">A3 (297×420mm)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Fit</label>
                <select
                  value={settings.imageSettings?.fit || 'contain'}
                  onChange={(e) => handleSettingChange('imageSettings', { ...settings.imageSettings, fit: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="contain">Fit to page (maintain aspect ratio)</option>
                  <option value="cover">Fill page (may crop image)</option>
                  <option value="stretch">Stretch to fill page</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Supported Formats:</h5>
              <p className="text-sm text-blue-700">
                <strong>JPG, JPEG, PNG, BMP, GIF, WebP</strong>
              </p>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p>• <strong>Auto Page Size:</strong> PDF pages sized to match each image</p>
                <p>• <strong>Fixed Page Size:</strong> All images placed on standard page sizes</p>
                <p>• <strong>Image Fit:</strong> Controls how images are positioned on the page</p>
              </div>
            </div>
          </div>
        );
      
      case 'pdf-to-image':
        return (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="text-md font-semibold text-gray-800">PDF to Images Settings</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
                <select
                  value={settings.pdfToImageSettings?.format || 'png'}
                  onChange={(e) => handleSettingChange('pdfToImageSettings', { ...settings.pdfToImageSettings, format: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="png">PNG (High Quality)</option>
                  <option value="jpeg">JPEG (Smaller Size)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DPI (Dots Per Inch)</label>
                <select
                  value={settings.pdfToImageSettings?.dpi || '150'}
                  onChange={(e) => handleSettingChange('pdfToImageSettings', { ...settings.pdfToImageSettings, dpi: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="72">72 DPI (Web Quality)</option>
                  <option value="150">150 DPI (Standard)</option>
                  <option value="300">300 DPI (Print Quality)</option>
                  <option value="600">600 DPI (High Resolution)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">JPEG Quality (if JPEG selected)</label>
                <select
                  value={settings.pdfToImageSettings?.quality || 'high'}
                  onChange={(e) => handleSettingChange('pdfToImageSettings', { ...settings.pdfToImageSettings, quality: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={settings.pdfToImageSettings?.format === 'png'}
                >
                  <option value="high">High (95%)</option>
                  <option value="medium">Medium (80%)</option>
                  <option value="low">Low (60%)</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Output Information:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>PNG:</strong> Lossless compression, larger file size, best quality</li>
                <li>• <strong>JPEG:</strong> Lossy compression, smaller file size, good for photos</li>
                <li>• <strong>Higher DPI:</strong> Better quality but larger file sizes</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Output Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Paper Size</label>
              <select
                value={settings.paperSize}
                onChange={(e) => handleSettingChange('paperSize', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">PDF Manipulation Tools</h2>
      </div>

      {/* Operation Mode Selection */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Operation Mode</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { value: 'merge-pdf', label: 'Merge PDFs', desc: 'Combine multiple PDF files into one' },
            { value: 'split-pdf', label: 'Split PDF', desc: 'Extract pages or split into multiple files' },
            { value: 'image-to-pdf', label: 'Images to PDF', desc: 'Convert images to PDF format' },
            { value: 'pdf-to-image', label: 'PDF to Images', desc: 'Convert PDF pages to image files' },
            { value: 'pdf-page-counter', label: 'PDF Page Counter', desc: 'Count total pages in PDF files' }
          ].map(mode => (
            <label
              key={mode.value}
              className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                settings.mode === mode.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
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
          <h4 className="text-sm font-semibold text-blue-800 mb-2">PDF Manipulation Features:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Merge PDFs:</strong> Combine multiple PDF documents with optional blank page insertion</li>
            <li>• <strong>Split PDF:</strong> Extract specific pages, ranges, or split by odd/even pages</li>
            <li>• <strong>Images to PDF:</strong> Convert various image formats to high-quality PDF documents</li>
            <li>• <strong>PDF to Images:</strong> Convert PDF pages to high-quality PNG images</li>
            <li>• <strong>PDF Page Counter:</strong> Display total page count for uploaded PDF files</li>
          </ul>
        </div>
      </div>

      {/* Mode-specific Controls */}
      {renderModeSpecificControls()}

      {/* File Upload */}
      <FileUpload
        id="pdfUpload"
        accept={settings.mode === 'image-to-pdf' ? 'image/jpeg,image/png,image/bmp,image/gif,image/webp' : '.pdf'}
        multiple={settings.mode === 'merge-pdf' || settings.mode === 'image-to-pdf' || settings.mode === 'pdf-page-counter'}
        onFileChange={handleFileChange}
        label={
          settings.mode === 'merge-pdf' ? 'Upload PDFs to merge' :
          settings.mode === 'image-to-pdf' ? 'Upload Images to convert' :
          settings.mode === 'pdf-to-image' ? 'Upload PDF to convert to images' :
          settings.mode === 'pdf-page-counter' ? 'Upload PDFs to count pages' :
          'Upload a PDF'
        }
        description="Drag & Drop or Click to Select"
        fileCount={getFileCountDisplay()}
      />

      {/* Process Button */}
      <button
        onClick={processPDF}
        disabled={isProcessing || pdfFiles.length === 0}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            {settings.mode === 'pdf-page-counter' ? 'Count PDF Pages' : 
             settings.mode === 'pdf-to-image' ? 'Convert PDF to Images' : 
             'Process PDF File'}
          </span>
        )}
      </button>

      {/* Status Message */}
      <StatusMessage status={status} isProcessing={isProcessing} />

      {/* Page Count Results */}
      {pageCountResults.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">📊 Page Count Results</h3>
          <div className="space-y-3">
            {pageCountResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-3 rounded-md border border-green-100">
                <span className="text-gray-700 font-medium truncate mr-4">{result.filename}</span>
                <span className="text-green-700 font-bold text-lg">
                  {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'}
                </span>
              </div>
            ))}
            <div className="border-t border-green-200 pt-3 mt-4">
              <div className="flex justify-between items-center bg-green-100 p-3 rounded-md">
                <span className="text-green-800 font-bold">Total Pages:</span>
                <span className="text-green-800 font-bold text-xl">
                  {pageCountResults.reduce((sum, result) => sum + result.pageCount, 0)} pages
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery for PDF to Images */}
      {convertedImages.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📸 Converted Images Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {convertedImages.map((image) => (
              <div key={image.pageNumber} className="bg-gray-50 rounded-lg p-4 border">
                <div className="aspect-[3/4] bg-white rounded mb-3 overflow-hidden shadow-sm">
                  <img
                    src={image.dataUrl}
                    alt={`Page ${image.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Page {image.pageNumber}
                  </span>
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(image.blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const extension = settings.pdfToImageSettings?.format === 'jpeg' ? 'jpg' : 'png';
                      a.download = `page-${image.pageNumber.toString().padStart(3, '0')}.${extension}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Link */}
      {downloadUrl && (
        <div className="text-center">
          <DownloadButton
            href={downloadUrl}
            filename={downloadFilename}
          >
            Download Processed File
          </DownloadButton>
        </div>
      )}
    </div>
  );
};

export default PdfManipulation;