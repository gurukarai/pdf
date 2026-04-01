import React, { useState, useMemo, useRef } from 'react';
import { Calculator, Copy, FileText, Printer, Upload, Download, Scissors, Wand2, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

type SplitterMode = 'manual' | 'auto';

interface AutoSplitResult {
  colorPageNumbers: number[];
  monoPageNumbers: number[];
  colorPdfUrl: string | null;
  monoPdfUrl: string | null;
}

async function isColorPage(
  pdfPage: pdfjsLib.PDFPageProxy,
  threshold = 10,
  sampleSize = 4
): Promise<boolean> {
  const viewport = pdfPage.getViewport({ scale: 0.5 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width / sampleSize);
  canvas.height = Math.round(viewport.height / sampleSize);
  const ctx = canvas.getContext('2d')!;
  const smallViewport = pdfPage.getViewport({ scale: 0.5 / sampleSize });
  await pdfPage.render({ canvasContext: ctx, viewport: smallViewport }).promise;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxRg = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    if (maxRg > threshold) return true;
  }
  return false;
}

function PageRangeCalculator() {
  const [mode, setMode] = useState<SplitterMode>('manual');
  const [totalPages, setTotalPages] = useState<string>('100');
  const [colorPages, setColorPages] = useState<string>('1,8,21-25,30,90-99');
  const [copied, setCopied] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [splitStatus, setSplitStatus] = useState<string>('');

  const [autoFile, setAutoFile] = useState<File | null>(null);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoProgress, setAutoProgress] = useState<string>('');
  const [autoResult, setAutoResult] = useState<AutoSplitResult | null>(null);
  const autoFileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const parsePageNumbers = (input: string): number[] => {
    if (!input.trim()) return [];
    const pages = new Set<number>();
    for (const part of input.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0 && start <= end) {
          for (let i = start; i <= end; i++) pages.add(i);
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num) && num > 0) pages.add(num);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const calculateRanges = useMemo(() => {
    const total = parseInt(totalPages) || 0;
    if (total <= 0) return { colorPages: 0, monoPages: 0, ranges: [], rangeString: '' };
    const colorPageNumbers = parsePageNumbers(colorPages);
    const colorSet = new Set(colorPageNumbers);
    const monoPageNumbers: number[] = [];
    for (let i = 1; i <= total; i++) {
      if (!colorSet.has(i)) monoPageNumbers.push(i);
    }
    const ranges: string[] = [];
    if (monoPageNumbers.length > 0) {
      let rangeStart = monoPageNumbers[0];
      let rangeEnd = monoPageNumbers[0];
      for (let i = 1; i < monoPageNumbers.length; i++) {
        if (monoPageNumbers[i] === rangeEnd + 1) {
          rangeEnd = monoPageNumbers[i];
        } else {
          ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
          rangeStart = monoPageNumbers[i];
          rangeEnd = monoPageNumbers[i];
        }
      }
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
    }
    return { colorPages: colorPageNumbers.length, monoPages: monoPageNumbers.length, ranges, rangeString: ranges.join(', ') };
  }, [totalPages, colorPages]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calculateRanges.rangeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleManualFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setSplitStatus('');
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        setTotalPages(pdfDoc.getPageCount().toString());
      } catch (err) {
        setSplitStatus('Failed to load PDF file');
      }
    }
  };

  const splitPdf = async () => {
    if (!pdfFile) {
      setSplitStatus('Please upload a PDF file first');
      return;
    }
    setSplitting(true);
    setSplitStatus('Splitting PDF...');
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPageCount = pdfDoc.getPageCount();
      const colorPageNumbers = parsePageNumbers(colorPages);
      const colorSet = new Set(colorPageNumbers);
      const colorPdf = await PDFDocument.create();
      const monoPdf = await PDFDocument.create();
      for (let i = 0; i < totalPageCount; i++) {
        const pageNumber = i + 1;
        const [copiedPage] = await (colorSet.has(pageNumber) ? colorPdf : monoPdf).copyPages(pdfDoc, [i]);
        colorSet.has(pageNumber) ? colorPdf.addPage(copiedPage) : monoPdf.addPage(copiedPage);
      }
      const colorPdfBytes = await colorPdf.save();
      const monoPdfBytes = await monoPdf.save();
      const colorLink = document.createElement('a');
      colorLink.href = URL.createObjectURL(new Blob([colorPdfBytes], { type: 'application/pdf' }));
      colorLink.download = `${pdfFile.name.replace('.pdf', '')}_color.pdf`;
      colorLink.click();
      setTimeout(() => {
        const monoLink = document.createElement('a');
        monoLink.href = URL.createObjectURL(new Blob([monoPdfBytes], { type: 'application/pdf' }));
        monoLink.download = `${pdfFile.name.replace('.pdf', '')}_mono.pdf`;
        monoLink.click();
      }, 100);
      setSplitStatus('PDF split successfully! Downloads started.');
    } catch (err) {
      setSplitStatus('Failed to split PDF. Please try again.');
    } finally {
      setSplitting(false);
    }
  };

  const handleAutoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && file.type === 'application/pdf') {
      setAutoFile(file);
      setAutoResult(null);
      setAutoProgress('');
    }
  };

  const runAutoSplit = async () => {
    if (!autoFile) return;
    setAutoDetecting(true);
    setAutoProgress('Loading PDF...');
    setAutoResult(null);

    if (autoResult?.colorPdfUrl) URL.revokeObjectURL(autoResult.colorPdfUrl);
    if (autoResult?.monoPdfUrl) URL.revokeObjectURL(autoResult.monoPdfUrl);

    try {
      const arrayBuffer = await autoFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0), isEvalSupported: false, useSystemFonts: true }).promise;
      const totalPageCount = pdfDoc.getPageCount();

      const colorPageNumbers: number[] = [];
      const monoPageNumbers: number[] = [];

      for (let i = 0; i < totalPageCount; i++) {
        setAutoProgress(`Analyzing page ${i + 1} of ${totalPageCount}...`);
        const page = await pdjsDoc.getPage(i + 1);
        const color = await isColorPage(page);
        if (color) colorPageNumbers.push(i + 1);
        else monoPageNumbers.push(i + 1);
      }

      setAutoProgress('Building color PDF...');
      const colorPdf = await PDFDocument.create();
      for (const pageNum of colorPageNumbers) {
        const [p] = await colorPdf.copyPages(pdfDoc, [pageNum - 1]);
        colorPdf.addPage(p);
      }

      setAutoProgress('Building mono PDF...');
      const monoPdf = await PDFDocument.create();
      for (const pageNum of monoPageNumbers) {
        const [p] = await monoPdf.copyPages(pdfDoc, [pageNum - 1]);
        monoPdf.addPage(p);
      }

      const colorPdfUrl = colorPageNumbers.length > 0
        ? URL.createObjectURL(new Blob([await colorPdf.save()], { type: 'application/pdf' }))
        : null;
      const monoPdfUrl = monoPageNumbers.length > 0
        ? URL.createObjectURL(new Blob([await monoPdf.save()], { type: 'application/pdf' }))
        : null;

      setAutoResult({ colorPageNumbers, monoPageNumbers, colorPdfUrl, monoPdfUrl });
      setAutoProgress('Detection complete!');
    } catch (err) {
      setAutoProgress('Failed to process PDF. Please try again.');
    } finally {
      setAutoDetecting(false);
    }
  };

  const downloadAuto = (url: string, suffix: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${autoFile!.name.replace('.pdf', '')}_${suffix}.pdf`;
    a.click();
  };

  const numbersToRangeString = (nums: number[]) => {
    if (nums.length === 0) return 'None';
    const sorted = [...nums].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) { end = sorted[i]; }
      else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = sorted[i]; end = sorted[i]; }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
          <Calculator className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Color - Mono Pages Splitter</h2>
          <p className="text-gray-600 mt-1">
            Separate your color and mono printing jobs efficiently.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
            mode === 'manual'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Manual
        </button>
        <button
          onClick={() => setMode('auto')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
            mode === 'auto'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Auto Splitter
        </button>
      </div>

      {mode === 'manual' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Document Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Pages</label>
                  <input
                    type="number"
                    min="1"
                    value={totalPages}
                    onChange={(e) => setTotalPages(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Pages</label>
                  <input
                    type="text"
                    value={colorPages}
                    onChange={(e) => setColorPages(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="1,8,21-25,30,90-99"
                  />
                  <p className="text-xs text-gray-500 mt-2">Enter page numbers or ranges (e.g., 1,8,21-25)</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Color Pages</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{calculateRanges.colorPages}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Mono Pages</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-600">{calculateRanges.monoPages}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Printer className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">Mono Print Ranges</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Pages to print on mono printer:</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {calculateRanges.ranges.length > 0 ? (
                      calculateRanges.ranges.map((range, index) => (
                        <span key={index} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                          {range}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm italic">No mono pages to print</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Print Range String:</label>
                  <div className="relative">
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono text-sm min-h-[48px] flex items-center">
                      {calculateRanges.rangeString || 'No ranges to display'}
                    </div>
                    <button
                      onClick={handleCopy}
                      disabled={!calculateRanges.rangeString}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        calculateRanges.rangeString
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-800 mb-1">Printing Tips:</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• First, print color pages: {colorPages || 'None specified'}</li>
                        <li>• Then, print mono pages using the ranges above</li>
                        <li>• Copy the range string for easy pasting into your printer dialog</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">PDF Splitter</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a PDF file to automatically split it into separate color and mono PDFs based on the pages you've specified above.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF File</label>
                <input
                  ref={manualFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleManualFileUpload}
                  className="hidden"
                />
                <div
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  onClick={() => manualFileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {pdfFile ? pdfFile.name : 'Click to select PDF file'}
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={splitPdf}
                  disabled={!pdfFile || splitting}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    pdfFile && !splitting
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  {splitting ? 'Splitting PDF...' : 'Split PDF'}
                </button>
              </div>
            </div>
            {splitStatus && (
              <div className={`mt-4 p-3 rounded-lg ${
                splitStatus.includes('success')
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : splitStatus.includes('Failed')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                <p className="text-sm font-medium">{splitStatus}</p>
              </div>
            )}
            {pdfFile && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Split Preview:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Color PDF will contain: </span>
                    <span className="font-medium text-blue-600">{calculateRanges.colorPages} pages</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Mono PDF will contain: </span>
                    <span className="font-medium text-gray-600">{calculateRanges.monoPages} pages</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'auto' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Auto Color/Mono Detection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Upload a PDF and the tool will automatically analyze each page to detect whether it is color or monochrome, then let you download them as separate PDFs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF File</label>
                <input
                  ref={autoFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleAutoFileUpload}
                  className="hidden"
                />
                <div
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  onClick={() => autoFileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {autoFile ? autoFile.name : 'Click to select PDF file'}
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={runAutoSplit}
                  disabled={!autoFile || autoDetecting}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    autoFile && !autoDetecting
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {autoDetecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Auto Detect &amp; Split
                    </>
                  )}
                </button>
              </div>
            </div>

            {autoDetecting && autoProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                  <p className="text-sm text-blue-700 font-medium">{autoProgress}</p>
                </div>
              </div>
            )}

            {!autoDetecting && autoProgress && !autoResult && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">{autoProgress}</p>
              </div>
            )}
          </div>

          {autoResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-5">Detection Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="border border-blue-200 rounded-xl p-5 bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <h4 className="font-semibold text-blue-800">Color Pages</h4>
                    <span className="ml-auto text-2xl font-bold text-blue-700">{autoResult.colorPageNumbers.length}</span>
                  </div>
                  <p className="text-xs text-blue-600 font-mono mb-4 leading-relaxed break-all">
                    {numbersToRangeString(autoResult.colorPageNumbers)}
                  </p>
                  {autoResult.colorPdfUrl ? (
                    <button
                      onClick={() => downloadAuto(autoResult.colorPdfUrl!, 'color')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Color PDF
                    </button>
                  ) : (
                    <p className="text-xs text-blue-500 italic text-center">No color pages detected</p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <h4 className="font-semibold text-gray-700">Mono Pages</h4>
                    <span className="ml-auto text-2xl font-bold text-gray-600">{autoResult.monoPageNumbers.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-4 leading-relaxed break-all">
                    {numbersToRangeString(autoResult.monoPageNumbers)}
                  </p>
                  {autoResult.monoPdfUrl ? (
                    <button
                      onClick={() => downloadAuto(autoResult.monoPdfUrl!, 'mono')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Mono PDF
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center">No mono pages detected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PageRangeCalculator;
