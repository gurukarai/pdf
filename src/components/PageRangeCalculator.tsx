import React, { useState, useMemo } from 'react';
import { Calculator, Copy, FileText, Printer, Upload, Download, Scissors } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

function PageRangeCalculator() {
  const [totalPages, setTotalPages] = useState<string>('100');
  const [colorPages, setColorPages] = useState<string>('1,8,21-25,30,90-99');
  const [copied, setCopied] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [splitStatus, setSplitStatus] = useState<string>('');

  const parsePageNumbers = (input: string): number[] => {
    if (!input.trim()) return [];

    const pages = new Set<number>();
    const parts = input.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0 && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num) && num > 0) {
          pages.add(num);
        }
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
      if (!colorSet.has(i)) {
        monoPageNumbers.push(i);
      }
    }

    const ranges: string[] = [];
    if (monoPageNumbers.length > 0) {
      let rangeStart = monoPageNumbers[0];
      let rangeEnd = monoPageNumbers[0];

      for (let i = 1; i < monoPageNumbers.length; i++) {
        if (monoPageNumbers[i] === rangeEnd + 1) {
          rangeEnd = monoPageNumbers[i];
        } else {
          if (rangeStart === rangeEnd) {
            ranges.push(`${rangeStart}`);
          } else {
            ranges.push(`${rangeStart}-${rangeEnd}`);
          }
          rangeStart = monoPageNumbers[i];
          rangeEnd = monoPageNumbers[i];
        }
      }

      if (rangeStart === rangeEnd) {
        ranges.push(`${rangeStart}`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
    }

    return {
      colorPages: colorPageNumbers.length,
      monoPages: monoPageNumbers.length,
      ranges,
      rangeString: ranges.join(', ')
    };
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setSplitStatus('');

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        setTotalPages(pageCount.toString());
      } catch (err) {
        console.error('Failed to load PDF:', err);
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

        if (colorSet.has(pageNumber)) {
          colorPdf.addPage(copiedPage);
        } else {
          monoPdf.addPage(copiedPage);
        }
      }

      const colorPdfBytes = await colorPdf.save();
      const monoPdfBytes = await monoPdf.save();

      const colorBlob = new Blob([colorPdfBytes], { type: 'application/pdf' });
      const monoBlob = new Blob([monoPdfBytes], { type: 'application/pdf' });

      const colorUrl = URL.createObjectURL(colorBlob);
      const monoUrl = URL.createObjectURL(monoBlob);

      const colorLink = document.createElement('a');
      colorLink.href = colorUrl;
      colorLink.download = `${pdfFile.name.replace('.pdf', '')}_color.pdf`;
      colorLink.click();

      setTimeout(() => {
        const monoLink = document.createElement('a');
        monoLink.href = monoUrl;
        monoLink.download = `${pdfFile.name.replace('.pdf', '')}_mono.pdf`;
        monoLink.click();

        URL.revokeObjectURL(colorUrl);
        URL.revokeObjectURL(monoUrl);
      }, 100);

      setSplitStatus('PDF split successfully! Downloads started.');
    } catch (err) {
      console.error('Failed to split PDF:', err);
      setSplitStatus('Failed to split PDF. Please try again.');
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Calculator className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Color - Mono Pages Splitter</h2>
          <p className="text-gray-600 mt-1">
            Separate your color and mono printing jobs efficiently. Enter your color pages, and we'll calculate the remaining pages for mono printing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Document Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Pages
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Pages
              </label>
              <input
                type="text"
                value={colorPages}
                onChange={(e) => setColorPages(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="1,8,21-25,30,90-99"
              />
              <p className="text-xs text-gray-500 mt-2">Enter page numbers or ranges (e.g., 1,8,21-25 or 1-10 for pages 1 to 10)</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Color Pages</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{calculateRanges.colorPages}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pages to print on mono printer:
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {calculateRanges.ranges.length > 0 ? (
                  calculateRanges.ranges.map((range, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200"
                    >
                      {range}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">No mono pages to print</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Print Range String:
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PDF File
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
              >
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {pdfFile ? pdfFile.name : 'Click to select PDF file'}
                </span>
              </label>
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
                <span className="font-medium text-purple-600">{calculateRanges.colorPages} pages</span>
              </div>
              <div>
                <span className="text-gray-600">Mono PDF will contain: </span>
                <span className="font-medium text-gray-600">{calculateRanges.monoPages} pages</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PageRangeCalculator;
