import React, { useState, useCallback } from 'react';
import {
  Sparkles, Settings, Zap, Upload, X, CheckCircle, AlertCircle,
  FileImage, ChevronDown, ChevronUp, RotateCcw, Download
} from 'lucide-react';
import StatusMessage from './StatusMessage';
import { IntelligenceCollageSettings, StatusMessage as StatusMessageType } from '../types';
import { processIntelligenceCollage, parseDimensionsFromFilename } from '../utils/intelligenceCollageUtils';

interface FileEntry {
  file: File;
  parsed: { width: number; height: number; unit: 'in' | 'mm' | 'cm' } | null;
}

const PAPER_SIZES = [
  { value: '13x19', label: '13 × 19 in' },
  { value: '12x18', label: '12 × 18 in' },
  { value: 'a3', label: 'A3 (297 × 420 mm)' },
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'legal', label: 'Legal (8.5 × 14 in)' },
  { value: 'tabloid', label: 'Tabloid (11 × 17 in)' },
  { value: 'custom', label: 'Custom Size' },
];

const DEFAULT_SETTINGS: IntelligenceCollageSettings = {
  paperSize: '13x19',
  unit: 'in',
  marginTop: 0.25,
  marginBottom: 0.25,
  marginLeft: 0.25,
  marginRight: 0.25,
  outputFormat: 'pdf',
  allowRotation: true,
  spacing: 0.05,
  quality: 95,
};

const IntelligenceCollage: React.FC = () => {
  const [settings, setSettings] = useState<IntelligenceCollageSettings>(DEFAULT_SETTINGS);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [showSettings, setShowSettings] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const entries: FileEntry[] = arr.map((file) => ({
      file,
      parsed: parseDimensionsFromFilename(file.name),
    }));
    setFileEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name + e.file.size));
      const unique = entries.filter((e) => !existing.has(e.file.name + e.file.size));
      return [...prev, ...unique];
    });
    setStatus(null);
    setDownloadUrl('');
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setFileEntries([]);
    setStatus(null);
    setDownloadUrl('');
  }, []);

  const set = useCallback(<K extends keyof IntelligenceCollageSettings>(
    key: K, value: IntelligenceCollageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const step = settings.unit === 'mm' ? '1' : settings.unit === 'cm' ? '0.1' : '0.01';

  const parsedCount = fileEntries.filter((e) => e.parsed !== null).length;
  const failedCount = fileEntries.filter((e) => e.parsed === null).length;

  const processCollage = useCallback(async () => {
    if (fileEntries.length === 0) {
      setStatus({ message: 'Please upload images first.', type: 'error' });
      return;
    }
    if (parsedCount === 0) {
      setStatus({ message: 'No files have valid dimensions in their filename. Rename files like "4inx6in-photo.jpg".', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setDownloadUrl('');

    try {
      const validFiles = fileEntries.filter((e) => e.parsed !== null).map((e) => e.file);
      const result = await processIntelligenceCollage(validFiles, settings, (msg) => {
        setStatus({ message: msg, type: 'info' });
      });
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadFilename(result.filename);
      setStatus({ message: `Collage created successfully from ${parsedCount} image(s).`, type: 'success' });
    } catch (err) {
      setStatus({
        message: err instanceof Error ? err.message : 'An unknown error occurred.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [fileEntries, settings, parsedCount]);

  const formatDims = (entry: FileEntry) => {
    if (!entry.parsed) return null;
    const { width, height, unit } = entry.parsed;
    return `${width} × ${height} ${unit}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Intelligence Collage</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Auto-packs images onto paper using dimensions parsed from filenames
          </p>
        </div>
      </div>

      {/* Filename format guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">Supported filename formats</p>
        <div className="flex flex-wrap gap-2">
          {['4inx6in-photo.jpg', '30mmx60mm-card.jpg', '10cmx15cm.jpg', '5x7in_001.jpg'].map((ex) => (
            <code key={ex} className="bg-amber-100 text-amber-900 text-xs px-2 py-1 rounded font-mono">{ex}</code>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-pink-400 bg-pink-50'
            : 'border-gray-300 bg-gray-50 hover:border-pink-300 hover:bg-pink-50/30'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-pink-500' : 'text-gray-400'}`} />
        <p className="text-gray-700 font-medium">
          {isDragging ? 'Drop images here' : 'Drag & drop images, or click to select'}
        </p>
        <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, WEBP, HEIC and more</p>
      </div>

      {/* File list */}
      {fileEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FileImage className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                {fileEntries.length} file{fileEntries.length !== 1 ? 's' : ''}
              </span>
              {parsedCount > 0 && (
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                  {parsedCount} valid
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                  {failedCount} no dims
                </span>
              )}
            </div>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {fileEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                {entry.parsed ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 flex-1 truncate">{entry.file.name}</span>
                {entry.parsed ? (
                  <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded whitespace-nowrap">
                    {formatDims(entry)}
                  </span>
                ) : (
                  <span className="text-xs text-red-500 whitespace-nowrap">no dimensions</span>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings panel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Collage Settings</span>
          </div>
          {showSettings ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {showSettings && (
          <div className="p-5 space-y-5">
            {/* Row 1: Paper, Unit, Output */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Paper Size
                </label>
                <select
                  value={settings.paperSize}
                  onChange={(e) => set('paperSize', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-white"
                >
                  {PAPER_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Unit
                </label>
                <select
                  value={settings.unit}
                  onChange={(e) => set('unit', e.target.value as 'in' | 'mm' | 'cm')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-white"
                >
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="mm">Millimeters (mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Output Format
                </label>
                <select
                  value={settings.outputFormat}
                  onChange={(e) => set('outputFormat', e.target.value as 'pdf' | 'jpg')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-white"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="jpg">JPG Images (ZIP)</option>
                </select>
              </div>
            </div>

            {/* Custom size */}
            {settings.paperSize === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                    Width ({settings.unit})
                  </label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    value={settings.customWidth || ''}
                    onChange={(e) => set('customWidth', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="Width"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                    Height ({settings.unit})
                  </label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    value={settings.customHeight || ''}
                    onChange={(e) => set('customHeight', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="Height"
                  />
                </div>
              </div>
            )}

            {/* Margins */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                Margins ({settings.unit})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => {
                  const key = `margin${side}` as keyof IntelligenceCollageSettings;
                  return (
                    <div key={side}>
                      <label className="block text-xs text-gray-500 mb-1">{side}</label>
                      <input
                        type="number"
                        step={step}
                        min="0"
                        value={settings[key] as number}
                        onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spacing, Quality, Rotation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Spacing ({settings.unit})
                </label>
                <input
                  type="number"
                  step={step}
                  min="0"
                  value={settings.spacing}
                  onChange={(e) => set('spacing', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Quality (%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.quality}
                  onChange={(e) => set('quality', parseInt(e.target.value) || 95)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2.5 cursor-pointer py-2">
                  <div
                    onClick={() => set('allowRotation', !settings.allowRotation)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                      settings.allowRotation ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      settings.allowRotation ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-700">Allow rotation</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Process button */}
      <button
        onClick={processCollage}
        disabled={isProcessing || parsedCount === 0}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2.5">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2.5">
            <Zap className="w-5 h-5" />
            Create Intelligence Collage
            {parsedCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {parsedCount} image{parsedCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        )}
      </button>

      {/* Status */}
      <StatusMessage status={status} isProcessing={isProcessing} />

      {/* Download */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={downloadFilename}
          className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01]"
        >
          <Download className="w-5 h-5" />
          Download {downloadFilename}
        </a>
      )}
    </div>
  );
};

export default IntelligenceCollage;
