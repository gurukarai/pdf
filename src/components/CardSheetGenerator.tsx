import React, { useState, useCallback, useMemo } from 'react';
import { Settings, FileImage, Download, Zap } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { CardSheetSettings, StatusMessage as StatusMessageType } from '../types';
import { generateCardSheetPDF } from '../utils/pdfUtils';
import { SINGLE_IMAGE_POSITIONS } from '../constants';
import { computeAutoLayouts, LayoutSuggestion } from '../utils/autoLayoutUtils';

const CardSheetGenerator: React.FC = () => {
  const [settings, setSettings] = useState<CardSheetSettings>({
    paperType: 'a4',
    unit: 'mm',
    cardWidth: 87,
    cardHeight: 55,
    cardsPerRow: 2,
    cardsPerColumn: 5,
    rowGap: 2,
    colGap: 2,
    includeCropMarks: true,
    singleImagePosition: 'middle-center',
    singleMarginTop: 0,
    singleMarginBottom: 0,
    singleMarginLeft: 0,
    singleMarginRight: 0,
    cloneAndFill: false,
    rotationAngle: 0,
    bleed: 0,
    cuttingOffset: 0,
    cuttingOffsetUnit: 'mm',
    useMixedLayout: false,
    mixedHorizontalCards: 2,
    frontBackPrinting: false,
    pageMargin: 5
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isConvertingJpg, setIsConvertingJpg] = useState(false);
  const [isConvertingPng, setIsConvertingPng] = useState(false);
  const [autoDetectedDims, setAutoDetectedDims] = useState<{ width: number; height: number; unit: string } | null>(null);

  const isSingleImage = settings.cardsPerRow === 1 && settings.cardsPerColumn === 1;
  const isSingleFile = imageFiles.length === 1;

  const layoutSuggestions = useMemo<LayoutSuggestion[]>(() => {
    if (!settings.cardWidth || !settings.cardHeight) return [];
    return computeAutoLayouts(
      settings.paperType,
      settings.cardWidth,
      settings.cardHeight,
      settings.unit,
      settings.rowGap,
      settings.colGap,
      settings.pageMargin
    );
  }, [settings.paperType, settings.cardWidth, settings.cardHeight, settings.unit, settings.rowGap, settings.colGap, settings.pageMargin]);

  const applyLayoutSuggestion = useCallback((suggestion: LayoutSuggestion) => {
    setSettings(prev => ({
      ...prev,
      cardsPerRow: suggestion.cardsPerRow,
      cardsPerColumn: suggestion.cardsPerColumn,
      useMixedLayout: suggestion.useMixedLayout,
      mixedHorizontalCards: suggestion.mixedHorizontalCards,
      rotationAngle: suggestion.rotated ? 90 : 0,
    }));
  }, []);

  const parseDimensionsFromFilename = useCallback((filename: string): { width: number; height: number; unit: 'mm' | 'cm' | 'in' } | null => {
    const name = filename.replace(/\.[^.]+$/, '');
    const pattern = /(\d+(?:\.\d+)?)\s*(mm|cm|in)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|in)/i;
    const match = name.match(pattern);
    if (!match) return null;
    const w = parseFloat(match[1]);
    const unitW = match[2].toLowerCase() as 'mm' | 'cm' | 'in';
    const h = parseFloat(match[3]);
    const unitH = match[4].toLowerCase() as 'mm' | 'cm' | 'in';
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
    const toMm = (v: number, u: 'mm' | 'cm' | 'in') =>
      u === 'cm' ? v * 10 : u === 'in' ? v * 25.4 : v;
    const wMm = toMm(w, unitW);
    const hMm = toMm(h, unitH);
    const unit = unitW;
    const toUnit = (mm: number) =>
      unit === 'cm' ? parseFloat((mm / 10).toFixed(2)) :
      unit === 'in' ? parseFloat((mm / 25.4).toFixed(3)) :
      parseFloat(mm.toFixed(1));
    return { width: toUnit(wMm), height: toUnit(hMm), unit };
  }, []);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      const arr = Array.from(files);
      setImageFiles(arr);
      setStatus(null);
      setDownloadUrl('');
      if (arr.length !== 2) {
        setSettings(prev => ({ ...prev, frontBackPrinting: false }));
      }
      if (arr.length >= 1) {
        const dims = parseDimensionsFromFilename(arr[0].name);
        if (dims) {
          setSettings(prev => ({
            ...prev,
            cardWidth: dims.width,
            cardHeight: dims.height,
            unit: dims.unit,
          }));
          setAutoDetectedDims(dims);
        } else {
          setAutoDetectedDims(null);
        }
      }
    }
  }, [parseDimensionsFromFilename]);

  const handleSettingChange = useCallback((key: keyof CardSheetSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const getUnitLabel = (baseLabel: string) => {
    return `${baseLabel} (${settings.unit})`;
  };

  const getDefaultValues = () => {
    switch (settings.unit) {
      case 'cm':
        return {
          cardWidth: 8.7,
          cardHeight: 5.5,
          rowGap: 0.2,
          colGap: 0.2
        };
      case 'in':
        return {
          cardWidth: 3.43,
          cardHeight: 2.17,
          rowGap: 0.08,
          colGap: 0.08
        };
      default: // mm
        return {
          cardWidth: 87,
          cardHeight: 55,
          rowGap: 2,
          colGap: 2
        };
    }
  };

  const handleUnitChange = useCallback((newUnit: 'mm' | 'cm' | 'in') => {
    const defaults = getDefaultValues();
    setSettings(prev => ({
      ...prev,
      unit: newUnit,
      cardWidth: newUnit === 'cm' ? 8.7 : newUnit === 'in' ? 3.43 : 87,
      cardHeight: newUnit === 'cm' ? 5.5 : newUnit === 'in' ? 2.17 : 55,
      rowGap: newUnit === 'cm' ? 0.2 : newUnit === 'in' ? 0.08 : 2,
      colGap: newUnit === 'cm' ? 0.2 : newUnit === 'in' ? 0.08 : 2,
      singleMarginTop: 0,
      singleMarginBottom: 0,
      singleMarginLeft: 0,
      singleMarginRight: 0
    }));
  }, []);

  const generatePDF = useCallback(async () => {
    if (imageFiles.length === 0) {
      setStatus({ message: 'Please select images or PDFs to generate the card sheet.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');
    setPdfBlob(null);

    try {
      const blob = await generateCardSheetPDF(imageFiles, settings, (message) => {
        setStatus({ message, type: 'info' });
      });

      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({
        message: `✅ Success! Generated a PDF with card sheets.`,
        type: 'success'
      });
    } catch (error) {
      console.error('PDF generation error:', error);
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

  const downloadAsImage = useCallback(async (format: 'jpg' | 'png') => {
    if (!pdfBlob) return;
    const setLoading = format === 'jpg' ? setIsConvertingJpg : setIsConvertingPng;
    setLoading(true);
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpg' ? 0.95 : 1.0;
      const scale = 300 / 72;

      if (numPages === 1) {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `card-sheet.${format === 'jpg' ? 'jpg' : 'png'}`;
          a.click();
        }, mimeType, quality);
      } else {
        const zip = new JSZip();
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), mimeType, quality);
          });
          zip.file(`card-sheet-page-${String(i).padStart(2, '0')}.${format === 'jpg' ? 'jpg' : 'png'}`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `card-sheets-${numPages}pages.zip`;
        a.click();
      }
    } catch (err) {
      console.error('Image conversion error:', err);
    } finally {
      setLoading(false);
    }
  }, [pdfBlob]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileImage className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Image to Card Sheet PDF</h2>
      </div>

      {/* Settings Grid */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Preset Templates */}
          <div className="col-span-full mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Preset Templates</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setSettings({
                  paperType: '13x19',
                  unit: 'in',
                  cardWidth: 5.5,
                  cardHeight: 8.5,
                  cardsPerRow: 2,
                  cardsPerColumn: 2,
                  rowGap: 0,
                  colGap: 0,
                  includeCropMarks: true,
                  singleImagePosition: 'middle-center',
                  singleMarginTop: 0,
                  singleMarginBottom: 0,
                  singleMarginLeft: 0,
                  singleMarginRight: 0,
                  cloneAndFill: true,
                  rotationAngle: 0,
                  bleed: 0,
                  cuttingOffset: 0,
                  cuttingOffsetUnit: 'mm',
                  useMixedLayout: false,
                  mixedHorizontalCards: 2,
                  frontBackPrinting: false,
                  pageMargin: 5
                })}
                className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                📧 A5 / 8.5×5.5 Invitation
              </button>

              <button
                onClick={() => setSettings({
                  paperType: '13x19',
                  unit: 'mm',
                  cardWidth: 297,
                  cardHeight: 210,
                  cardsPerRow: 1,
                  cardsPerColumn: 2,
                  rowGap: 0,
                  colGap: 0,
                  includeCropMarks: true,
                  singleImagePosition: 'middle-center',
                  singleMarginTop: 0,
                  singleMarginBottom: 0,
                  singleMarginLeft: 0,
                  singleMarginRight: 0,
                  cloneAndFill: true,
                  rotationAngle: 0,
                  bleed: 0,
                  cuttingOffset: 0,
                  cuttingOffsetUnit: 'mm',
                  useMixedLayout: false,
                  mixedHorizontalCards: 2,
                  frontBackPrinting: false,
                  pageMargin: 5
                })}
                className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
              >
                📄 A4 / Letter Invitation
              </button>

              <button
                onClick={() => setSettings({
                  paperType: '13x19',
                  unit: 'mm',
                  cardWidth: 90,
                  cardHeight: 52,
                  cardsPerRow: 3,
                  cardsPerColumn: 9,
                  rowGap: 0,
                  colGap: 0,
                  includeCropMarks: true,
                  singleImagePosition: 'middle-center',
                  singleMarginTop: 0,
                  singleMarginBottom: 0,
                  singleMarginLeft: 0,
                  singleMarginRight: 0,
                  cloneAndFill: true,
                  rotationAngle: 0,
                  bleed: 0,
                  cuttingOffset: 0,
                  cuttingOffsetUnit: 'mm',
                  useMixedLayout: false,
                  mixedHorizontalCards: 2,
                  frontBackPrinting: false,
                  pageMargin: 5
                })}
                className="bg-orange-600 text-white px-4 py-3 rounded-md hover:bg-orange-700 transition-colors duration-200 text-sm font-medium"
              >
                💼 Visiting Card (27 cards)
              </button>

              <button
                onClick={() => setSettings({
                  paperType: '13x19',
                  unit: 'in',
                  cardWidth: 3.5,
                  cardHeight: 5,
                  cardsPerRow: 3,
                  cardsPerColumn: 3,
                  rowGap: 0,
                  colGap: 0,
                  includeCropMarks: true,
                  singleImagePosition: 'middle-center',
                  singleMarginTop: 0,
                  singleMarginBottom: 0,
                  singleMarginLeft: 0,
                  singleMarginRight: 0,
                  cloneAndFill: true,
                  rotationAngle: 0,
                  bleed: 0,
                  cuttingOffset: 0,
                  cuttingOffsetUnit: 'mm',
                  useMixedLayout: true,
                  mixedHorizontalCards: 2,
                  frontBackPrinting: false,
                  pageMargin: 5
                })}
                className="bg-teal-600 text-white px-4 py-3 rounded-md hover:bg-teal-700 transition-colors duration-200 text-sm font-medium"
              >
                🎴 3.5×5" Mixed (11 cards)
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <p>• <strong>A5 / 8.5×5.5 Invitation:</strong> 13×19" paper, 5.5×8.5" cards, 2×2 grid, clone & fill enabled</p>
              <p>• <strong>A4 / Letter Invitation:</strong> 13×19" paper, 297×210mm cards, 1×2 grid, clone & fill enabled</p>
              <p>• <strong>Visiting Card:</strong> 13×19" paper, 90×52mm cards, 3×9 grid (27 cards), clone & fill enabled</p>
              <p>• <strong>3.5×5" Mixed:</strong> 13×19" paper, 3.5×5" cards, mixed layout (9 vertical + 2 horizontal = 11 total)</p>
            </div>
          </div>

          {/* Auto-detect layout suggestions */}
          {layoutSuggestions.length > 0 && (
            <div className="col-span-full">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-700">Auto-Detected Layouts</h4>
                <span className="text-xs text-gray-400">— best fits for current card &amp; paper size</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {layoutSuggestions.map((s, i) => {
                  const isActive =
                    settings.cardsPerRow === s.cardsPerRow &&
                    settings.cardsPerColumn === s.cardsPerColumn &&
                    settings.useMixedLayout === s.useMixedLayout &&
                    (!s.useMixedLayout || settings.mixedHorizontalCards === s.mixedHorizontalCards);
                  return (
                    <button
                      key={i}
                      onClick={() => applyLayoutSuggestion(s)}
                      className={`group relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all duration-150 ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-xs font-bold tracking-wide uppercase ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                          {s.useMixedLayout ? 'Mixed' : s.rotated ? 'Rotated' : 'Grid'}
                        </span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.efficiency}%
                        </span>
                      </div>
                      <div className={`text-sm font-bold leading-tight ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>
                        {s.totalCards} cards
                      </div>
                      <div className={`text-xs mt-0.5 leading-snug ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {s.description}
                      </div>
                      {isActive && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">Efficiency = card area / paper area. Click a layout to apply it.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={settings.unit}
              onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'cm' | 'in')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mm">Millimeters (mm)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="in">Inches (in)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
            <select
              value={settings.paperType}
              onChange={(e) => handleSettingChange('paperType', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="a4">A4 (210x297mm)</option>
              <option value="letter">Letter (215.9x279.4mm)</option>
              <option value="legal">Legal (215.9x355.6mm)</option>
              <option value="a3">A3 (297x420mm)</option>
              <option value="12x18">12x18in (304.8x457.2mm)</option>
              <option value="13x19">13x19in (330.2x482.6mm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getUnitLabel('Image Width')}
              {autoDetectedDims && (
                <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  auto-detected
                </span>
              )}
            </label>
            <input
              type="number"
              step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
              value={settings.cardWidth}
              onChange={(e) => { handleSettingChange('cardWidth', parseFloat(e.target.value)); setAutoDetectedDims(null); }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getUnitLabel('Image Height')}
              {autoDetectedDims && (
                <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  auto-detected
                </span>
              )}
            </label>
            <input
              type="number"
              step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
              value={settings.cardHeight}
              onChange={(e) => { handleSettingChange('cardHeight', parseFloat(e.target.value)); setAutoDetectedDims(null); }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images per Row</label>
            <input
              type="number"
              value={settings.cardsPerRow}
              onChange={(e) => handleSettingChange('cardsPerRow', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images per Column</label>
            <input
              type="number"
              value={settings.cardsPerColumn}
              onChange={(e) => handleSettingChange('cardsPerColumn', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Row Gap')}</label>
            <input
              type="number"
              step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
              value={settings.rowGap}
              onChange={(e) => handleSettingChange('rowGap', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Column Gap')}</label>
            <input
              type="number"
              step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
              value={settings.colGap}
              onChange={(e) => handleSettingChange('colGap', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rotation Angle</label>
            <select
              value={settings.rotationAngle}
              onChange={(e) => handleSettingChange('rotationAngle', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>0° (No Rotation)</option>
              <option value={90}>90° (Clockwise)</option>
              <option value={180}>180° (Upside Down)</option>
              <option value={270}>270° (Counter-Clockwise)</option>
            </select>
          </div>

          <div className="col-span-full">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={settings.useMixedLayout}
                onChange={(e) => handleSettingChange('useMixedLayout', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              />
              Use Mixed Layout (Vertical + Horizontal cards)
            </label>
            {settings.useMixedLayout && (
              <div className="mt-2 ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Horizontal Cards at Bottom
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.mixedHorizontalCards}
                  onChange={(e) => handleSettingChange('mixedHorizontalCards', parseInt(e.target.value))}
                  className="w-32 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Layout: {settings.cardsPerRow}×{settings.cardsPerColumn} vertical cards + {settings.mixedHorizontalCards} horizontal cards = {(settings.cardsPerRow * settings.cardsPerColumn) + settings.mixedHorizontalCards} total cards per sheet
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Margin (mm)
              <span className="ml-1 text-xs text-gray-500">- Margin around entire sheet</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={settings.pageMargin}
              onChange={(e) => handleSettingChange('pageMargin', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bleed (mm)
              <span className="ml-1 text-xs text-gray-500">- Extra area for cutting tolerance</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={settings.bleed}
              onChange={(e) => {
                const bleedValue = parseFloat(e.target.value) || 0;
                handleSettingChange('bleed', bleedValue);
                // When bleed is enabled, disable cutting offset
                if (bleedValue > 0) {
                  handleSettingChange('cuttingOffset', 0);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cutting Offset Unit</label>
            <select
              value={settings.cuttingOffsetUnit}
              onChange={(e) => handleSettingChange('cuttingOffsetUnit', e.target.value)}
              disabled={settings.bleed > 0}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="mm">Millimeters (mm)</option>
              <option value="px">Pixels (px)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cutting Offset ({settings.cuttingOffsetUnit})
              <span className="ml-1 text-xs text-gray-500">- Inner guide marks</span>
            </label>
            <input
              type="number"
              min="0"
              step={settings.cuttingOffsetUnit === 'mm' ? '0.1' : '1'}
              value={settings.cuttingOffset}
              onChange={(e) => handleSettingChange('cuttingOffset', parseFloat(e.target.value) || 0)}
              disabled={settings.bleed > 0}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {settings.bleed > 0 && (
              <p className="mt-1 text-xs text-orange-600">
                Cutting offset is disabled when bleed is enabled
              </p>
            )}
          </div>

          <div className="col-span-full">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={settings.includeCropMarks}
                onChange={(e) => handleSettingChange('includeCropMarks', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              />
              Include Crop Marks
            </label>
          </div>

          {/* Clone and Fill Option - only show when single file is selected */}
          {isSingleFile && (
            <div className="col-span-full">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.cloneAndFill}
                  onChange={(e) => handleSettingChange('cloneAndFill', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                />
                Clone and Fill Pages (duplicate the single image to fill the grid)
              </label>
              {settings.cloneAndFill && (
                <p className="mt-1 text-xs text-gray-500">
                  The single image will be duplicated to fill all positions in the grid layout.
                </p>
              )}
            </div>
          )}

          {imageFiles.length === 2 && (
            <div className="col-span-full">
              <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.frontBackPrinting}
                  onChange={(e) => handleSettingChange('frontBackPrinting', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                />
                Front &amp; Back Printing (fill page 1 with first image, page 2 with second image)
              </label>
              {settings.frontBackPrinting && (
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Generates a 2-page PDF — page 1 is the front card sheet, page 2 is the back card sheet. Print double-sided for matching front &amp; back cards.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Single Image Placement Controls */}
        {isSingleImage && !settings.cloneAndFill && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Single Image Placement</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={settings.singleImagePosition}
                  onChange={(e) => handleSettingChange('singleImagePosition', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {SINGLE_IMAGE_POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Top Margin')}</label>
                <input
                  type="number"
                  step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
                  value={settings.singleMarginTop}
                  onChange={(e) => handleSettingChange('singleMarginTop', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Bottom Margin')}</label>
                <input
                  type="number"
                  step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
                  value={settings.singleMarginBottom}
                  onChange={(e) => handleSettingChange('singleMarginBottom', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Left Margin')}</label>
                <input
                  type="number"
                  step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
                  value={settings.singleMarginLeft}
                  onChange={(e) => handleSettingChange('singleMarginLeft', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getUnitLabel('Right Margin')}</label>
                <input
                  type="number"
                  step={settings.unit === 'in' ? '0.01' : settings.unit === 'cm' ? '0.1' : '1'}
                  value={settings.singleMarginRight}
                  onChange={(e) => handleSettingChange('singleMarginRight', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Upload */}
      <FileUpload
        id="frontImageInput"
        accept="image/*,application/pdf"
        multiple
        onFileChange={handleFileChange}
        label="Upload Images or PDFs for Card Sheet"
        description="Drag & Drop or Click to Select — Images & PDFs supported (each PDF page becomes a card)"
        fileCount={getFileCountDisplay()}
      />

      {/* Generate Button */}
      <button
        onClick={generatePDF}
        disabled={isProcessing || imageFiles.length === 0}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <>🚀 Generate Card Sheet PDF</>
        )}
      </button>

      {/* Status Message */}
      <StatusMessage status={status} isProcessing={isProcessing} />

      {/* Download Options */}
      {downloadUrl && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-600 text-center uppercase tracking-wide">Download As</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DownloadButton
              href={downloadUrl}
              filename="generated_card_sheets.pdf"
            >
              <Download className="w-4 h-4 inline mr-2" />
              PDF
            </DownloadButton>

            <button
              onClick={() => downloadAsImage('jpg')}
              disabled={isConvertingJpg}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-wait"
            >
              {isConvertingJpg ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Converting...</>
              ) : (
                <><Download className="w-4 h-4" /> JPG</>
              )}
            </button>

            <button
              onClick={() => downloadAsImage('png')}
              disabled={isConvertingPng}
              className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-wait"
            >
              {isConvertingPng ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Converting...</>
              ) : (
                <><Download className="w-4 h-4" /> PNG</>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">JPG/PNG renders at 300 DPI. Multi-page sheets download as ZIP.</p>
        </div>
      )}
    </div>
  );
};

export default CardSheetGenerator;