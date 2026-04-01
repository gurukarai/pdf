import React, { useState, useCallback } from 'react';
import { FileText, Settings, Zap, Eye, EyeOff, Download } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import FileUpload from './FileUpload';
import StatusMessage from './StatusMessage';
import DownloadButton from './DownloadButton';
import { OCRSettings, StatusMessage as StatusMessageType } from '../types';

const OCRProcessor: React.FC = () => {
  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'tesseract',
    language: 'eng',
    outputFormat: 'text',
    confidence: 70
  });

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Array<{filename: string, text: string, confidence?: number}>>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'hin', name: 'Hindi (हिन्दी)' },
    { code: 'tam', name: 'Tamil (தமிழ்)' },
    { code: 'tel', name: 'Telugu (తెలుగు)' },
    { code: 'kan', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'mal', name: 'Malayalam (മലയാളം)' },
    { code: 'guj', name: 'Gujarati (ગુજરાતી)' },
    { code: 'pan', name: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ben', name: 'Bengali (বাংলা)' },
    { code: 'mar', name: 'Marathi (मराठी)' },
    { code: 'ori', name: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'asm', name: 'Assamese (অসমীয়া)' },
    { code: 'urd', name: 'Urdu (اردو)' },
    { code: 'san', name: 'Sanskrit (संस्कृत)' }
  ];

  const apiModels = {
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    openrouter: ['google/gemini-flash-1.5', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini']
  };

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      setFiles(Array.from(files));
      setStatus(null);
      setResults([]);
      setDownloadUrl('');
    }
  }, []);

  const handleSettingChange = useCallback((key: keyof OCRSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Image loading failed for ${file.name}`));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error(`FileReader failed for ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const convertPdfToImages = async (file: File): Promise<HTMLImageElement[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: HTMLImageElement[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const img = new Image();
      img.src = canvas.toDataURL('image/png');
      await new Promise(resolve => { img.onload = resolve; });
      images.push(img);
    }

    return images;
  };

  const performTesseractOCR = async (image: HTMLImageElement, language: string): Promise<{text: string, confidence: number}> => {
    const worker = await createWorker(language);
    const { data } = await worker.recognize(image);
    await worker.terminate();
    return { text: data.text, confidence: data.confidence };
  };

  const performAPIBasedOCR = async (image: HTMLImageElement, settings: OCRSettings): Promise<{text: string}> => {
    // Convert image to base64
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    const languagePrompt = settings.language === 'eng' ? 'English' :
                          settings.language === 'tam' ? 'Tamil' :
                          settings.language === 'hin' ? 'Hindi' :
                          settings.language === 'tel' ? 'Telugu' :
                          settings.language === 'kan' ? 'Kannada' :
                          settings.language === 'mal' ? 'Malayalam' :
                          settings.language === 'guj' ? 'Gujarati' :
                          settings.language === 'pan' ? 'Punjabi' :
                          settings.language === 'ben' ? 'Bengali' :
                          settings.language === 'mar' ? 'Marathi' :
                          settings.language === 'ori' ? 'Odia' :
                          settings.language === 'asm' ? 'Assamese' :
                          settings.language === 'urd' ? 'Urdu' :
                          settings.language === 'san' ? 'Sanskrit' : 'English';

    const prompt = `Extract all text from this image. The text is primarily in ${languagePrompt}. Return only the extracted text without any additional commentary or formatting.`;

    let apiUrl = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    let body: any = {};

    switch (settings.engine) {
      case 'gemini':
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKey || ''}`;
        body = {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64
                }
              }
            ]
          }]
        };
        break;

      case 'openrouter':
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
        headers['HTTP-Referer'] = window.location.origin;
        body = {
          model: settings.model || 'google/gemini-flash-1.5',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
              ]
            }
          ]
        };
        break;

      default:
        throw new Error(`Engine ${settings.engine} does not support image processing`);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    let extractedText = '';
    switch (settings.engine) {
      case 'gemini':
        extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        break;
      case 'openrouter':
        extractedText = data.choices?.[0]?.message?.content || '';
        break;
    }

    return { text: extractedText };
  };

  const processOCR = useCallback(async () => {
    if (files.length === 0) {
      setStatus({ message: 'Please select PDF or image files to process.', type: 'error' });
      return;
    }

    if (settings.engine !== 'tesseract' && !settings.apiKey) {
      setStatus({ message: 'Please provide an API key for the selected engine.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus(null);
    setResults([]);
    setDownloadUrl('');

    try {
      const allResults: Array<{filename: string, text: string, confidence?: number}> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus({ message: `Processing ${file.name} (${i + 1}/${files.length})...`, type: 'info' });

        let images: HTMLImageElement[] = [];

        if (file.type === 'application/pdf') {
          images = await convertPdfToImages(file);
        } else if (file.type.startsWith('image/')) {
          const img = await loadImageFromFile(file);
          images = [img];
        } else {
          continue;
        }

        let combinedText = '';
        let totalConfidence = 0;
        let pageCount = 0;

        for (let j = 0; j < images.length; j++) {
          const image = images[j];
          setStatus({ 
            message: `Processing ${file.name} - ${images.length > 1 ? `Page ${j + 1}/${images.length}` : 'Extracting text'}...`, 
            type: 'info' 
          });

          try {
            if (settings.engine === 'tesseract') {
              const result = await performTesseractOCR(image, settings.language);
              combinedText += (combinedText ? '\n\n' : '') + result.text;
              totalConfidence += result.confidence;
              pageCount++;
            } else {
              const result = await performAPIBasedOCR(image, settings);
              combinedText += (combinedText ? '\n\n' : '') + result.text;
              pageCount++;
            }
          } catch (error) {
            console.error(`Error processing ${file.name} page ${j + 1}:`, error);
            combinedText += (combinedText ? '\n\n' : '') + `[Error processing page ${j + 1}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
          }
        }

        const avgConfidence = settings.engine === 'tesseract' && pageCount > 0 ? totalConfidence / pageCount : undefined;
        allResults.push({
          filename: file.name,
          text: combinedText,
          confidence: avgConfidence
        });
      }

      setResults(allResults);

      // Create download file
      const outputText = allResults.map(result => {
        let output = `=== ${result.filename} ===\n`;
        if (result.confidence !== undefined) {
          output += `Confidence: ${result.confidence.toFixed(1)}%\n`;
        }
        output += `\n${result.text}\n\n`;
        return output;
      }).join('\n');

      const blob = new Blob([outputText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      setStatus({
        message: `✅ Success! Extracted text from ${allResults.length} file(s).`,
        type: 'success'
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      setStatus({
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [files, settings]);

  const getFileCountDisplay = () => {
    if (files.length === 0) return 'No files selected';
    if (files.length === 1) return files[0].name;
    return `${files.length} files selected`;
  };

  const needsApiKey = settings.engine !== 'tesseract';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <FileText className="w-6 h-6 text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">OCR Text Extraction</h2>
      </div>

      {/* Settings */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">OCR Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OCR Engine</label>
            <select
              value={settings.engine}
              onChange={(e) => handleSettingChange('engine', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="tesseract">Tesseract.js (Free, Local)</option>
              <option value="gemini">Google Gemini API (Vision)</option>
              <option value="openrouter">OpenRouter API (Multiple Models)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
            <select
              value={settings.outputFormat}
              onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="text">Plain Text</option>
              <option value="json">JSON Format</option>
            </select>
          </div>

          {needsApiKey && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <select
                  value={settings.model || ''}
                  onChange={(e) => handleSettingChange('model', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                >
                  {apiModels[settings.engine as keyof typeof apiModels]?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.apiKey || ''}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 pr-10"
                    placeholder="Enter your API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {settings.engine === 'tesseract' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Confidence (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.confidence || 70}
                onChange={(e) => handleSettingChange('confidence', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Supported Features:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Input Files:</strong> PDF documents and image files (JPG, PNG, etc.)</li>
            <li>• <strong>Languages:</strong> English + 13 popular Indian languages including Tamil</li>
            <li>• <strong>Tesseract.js:</strong> Free, runs locally in browser, good accuracy</li>
            <li>• <strong>API Engines:</strong> Higher accuracy, requires API key, supports complex layouts</li>
            <li>• <strong>Multi-page PDFs:</strong> Processes all pages and combines results</li>
          </ul>
        </div>
      </div>

      {/* File Upload */}
      <FileUpload
        id="ocrFileInput"
        accept=".pdf,image/*"
        multiple
        onFileChange={handleFileChange}
        label="Upload PDF or Image Files"
        description="Drag & Drop or Click to Select"
        fileCount={getFileCountDisplay()}
      />

      {/* Process Button */}
      <button
        onClick={processOCR}
        disabled={isProcessing || files.length === 0 || (needsApiKey && !settings.apiKey)}
        className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing OCR...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            Extract Text with OCR
          </span>
        )}
      </button>

      {/* Status Message */}
      <StatusMessage status={status} isProcessing={isProcessing} />

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📄 Extracted Text Results</h3>
            {downloadUrl && (
              <DownloadButton
                href={downloadUrl}
                filename="ocr-results.txt"
                className="text-sm"
              >
                <Download className="w-4 h-4" />
                Download All Results
              </DownloadButton>
            )}
          </div>
          
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800">{result.filename}</h4>
                  {result.confidence !== undefined && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      result.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.confidence.toFixed(1)}% confidence
                    </span>
                  )}
                </div>
                <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {result.text || 'No text extracted'}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRProcessor;