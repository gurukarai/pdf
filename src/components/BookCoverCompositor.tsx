import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Image as ImageIcon, Download, CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileUploader from './FileUploader';
import ProcessingStatus from './ProcessingStatus';
import CanvasPreview from './CanvasPreview';
import PositionControls from './PositionControls';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  message?: string;
}

interface PaperSize {
  name: string;
  widthMM: number;
  heightMM: number;
  widthInches: number;
  heightInches: number;
}

const PAPER_SIZES: PaperSize[] = [
  { name: '13×19 in', widthMM: 482.6, heightMM: 330.2, widthInches: 19, heightInches: 13 },
  { name: '12×18 in', widthMM: 457.2, heightMM: 304.8, widthInches: 18, heightInches: 12 },
  { name: 'A3', widthMM: 420, heightMM: 297, widthInches: 16.54, heightInches: 11.69 },
  { name: 'A4', widthMM: 297, heightMM: 210, widthInches: 11.69, heightInches: 8.27 },
];

const DPI = 300;
const MM_TO_INCH = 1 / 25.4;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractPdfFirstPage(pdfFile: File): Promise<HTMLImageElement> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false, useSystemFonts: true }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 3 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL('image/png');
  });
}

function removeWhiteBackground(src: HTMLImageElement): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  if (w === 0 || h === 0) {
    return Promise.resolve(src);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    const result = new window.Image();
    result.onload = () => resolve(result);
    result.onerror = reject;
    result.src = canvas.toDataURL('image/png');
  });
}

async function renderComposite(
  backgroundImage: HTMLImageElement | null,
  pdfPageImage: HTMLImageElement | null,
  offsetX: number,
  offsetY: number,
  canvasWidthMM: number,
  canvasHeightMM: number
): Promise<Blob> {
  const canvasWidthPx = Math.round(canvasWidthMM * MM_TO_INCH * DPI);
  const canvasHeightPx = Math.round(canvasHeightMM * MM_TO_INCH * DPI);
  const pdfHalfWidthPx = Math.round((canvasWidthMM / 2) * MM_TO_INCH * DPI);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvasWidthPx, canvasHeightPx);
  }

  if (pdfPageImage) {
    const offsetXpx = Math.round(offsetX * MM_TO_INCH * DPI);
    const offsetYpx = Math.round(offsetY * MM_TO_INCH * DPI);
    const pdfX = pdfHalfWidthPx + offsetXpx;
    const pdfY = offsetYpx;
    ctx.drawImage(pdfPageImage, pdfX, pdfY, pdfHalfWidthPx, canvasHeightPx);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render composite'));
    }, 'image/jpeg', 0.97);
  });
}

async function buildPdfBundle(jpegBlobs: Blob[], canvasWidthMM: number, canvasHeightMM: number, canvasWidthPx: number, canvasHeightPx: number): Promise<Blob> {
  const pdfWidth = Math.round(canvasWidthMM * (72 / 25.4));
  const pdfHeight = Math.round(canvasHeightMM * (72 / 25.4));

  const imgByteArrays: Uint8Array[] = await Promise.all(
    jpegBlobs.map(blob => blob.arrayBuffer().then(buf => new Uint8Array(buf)))
  );

  const enc = new TextEncoder();
  type Part = Uint8Array | string;
  const parts: Part[] = [];
  let byteOffset = 0;
  const objOffsets: number[] = [];

  const addBytes = (data: Uint8Array | string) => {
    parts.push(data);
    byteOffset += typeof data === 'string' ? enc.encode(data).length : data.byteLength;
  };

  const beginObj = (n: number) => {
    objOffsets[n] = byteOffset;
    addBytes(`${n} 0 obj\n`);
  };
  const endObj = () => addBytes(`endobj\n`);

  addBytes(`%PDF-1.4\n%\xFF\xFF\xFF\xFF\n`);

  const totalObjs = 2 + jpegBlobs.length * 3;

  beginObj(1);
  addBytes(`<< /Type /Catalog /Pages 2 0 R >>\n`);
  endObj();

  const kidRefs = jpegBlobs.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  beginObj(2);
  addBytes(`<< /Type /Pages /Kids [${kidRefs}] /Count ${jpegBlobs.length} >>\n`);
  endObj();

  for (let i = 0; i < jpegBlobs.length; i++) {
    const pageObj = 3 + i * 3;
    const imgObj = pageObj + 1;
    const contentsObj = pageObj + 2;
    const imgName = `Im${i + 1}`;

    beginObj(pageObj);
    addBytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth} ${pdfHeight}]\n` +
      `/Resources << /XObject << /${imgName} ${imgObj} 0 R >> >>\n` +
      `/Contents ${contentsObj} 0 R >>\n`
    );
    endObj();

    const imgData = imgByteArrays[i];
    beginObj(imgObj);
    addBytes(
      `<< /Type /XObject /Subtype /Image /Width ${canvasWidthPx} /Height ${canvasHeightPx}\n` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8\n` +
      `/Filter /DCTDecode /Length ${imgData.byteLength} >>\n` +
      `stream\n`
    );
    addBytes(imgData);
    addBytes(`\nendstream\n`);
    endObj();

    const streamContent = `q ${pdfWidth} 0 0 ${pdfHeight} 0 0 cm /${imgName} Do Q`;
    const streamBytes = enc.encode(streamContent);
    beginObj(contentsObj);
    addBytes(`<< /Length ${streamBytes.byteLength} >>\nstream\n`);
    addBytes(streamBytes);
    addBytes(`\nendstream\n`);
    endObj();
  }

  const xrefPos = byteOffset;
  const xrefEntries = [`0000000000 65535 f \n`];
  for (let n = 1; n <= totalObjs; n++) {
    xrefEntries.push(`${objOffsets[n].toString().padStart(10, '0')} 00000 n \n`);
  }
  addBytes(`xref\n0 ${totalObjs + 1}\n${xrefEntries.join('')}`);
  addBytes(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const allBytes: Uint8Array[] = parts.map(p =>
    typeof p === 'string' ? enc.encode(p) : p
  );
  const totalLen = allBytes.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const b of allBytes) {
    out.set(b, pos);
    pos += b.byteLength;
  }

  return new Blob([out], { type: 'application/pdf' });
}

export default function BookCoverCompositor() {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [pdfPreviewImg, setPdfPreviewImg] = useState<HTMLImageElement | null>(null);
  const [previewPdfIndex, setPreviewPdfIndex] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedPaperSize, setSelectedPaperSize] = useState<PaperSize>(PAPER_SIZES[3]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!backgroundFile) {
      setBackgroundImg(null);
      return;
    }
    readFileAsDataUrl(backgroundFile).then(url => loadImage(url)).then(setBackgroundImg);
  }, [backgroundFile]);

  useEffect(() => {
    if (pdfFiles.length === 0) {
      setPdfPreviewImg(null);
      return;
    }
    const idx = Math.min(previewPdfIndex, pdfFiles.length - 1);
    extractPdfFirstPage(pdfFiles[idx])
      .then(img => removeWhiteBackground(img))
      .then(setPdfPreviewImg)
      .catch(() => setPdfPreviewImg(null));
  }, [pdfFiles, previewPdfIndex]);

  const updateStep = (index: number, status: ProcessingStep['status'], message?: string) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, status, ...(message ? { message } : {}) } : step
    ));
  };

  const handleProcess = async () => {
    if (pdfFiles.length === 0) {
      alert('Please upload at least one PDF file');
      return;
    }

    setIsProcessing(true);
    setDownloadUrl(null);

    const initialSteps: ProcessingStep[] = [
      { name: 'Loading background image', status: 'pending' },
      { name: 'Extracting PDF first pages', status: 'pending' },
      { name: 'Removing white backgrounds', status: 'pending' },
      { name: 'Rendering composites at 300 DPI', status: 'pending' },
      { name: 'Building final PDF bundle', status: 'pending' },
    ];
    setSteps(initialSteps);

    try {
      updateStep(0, 'processing');
      let bgImg: HTMLImageElement | null = backgroundImg;
      if (!bgImg && backgroundFile) {
        const url = await readFileAsDataUrl(backgroundFile);
        bgImg = await loadImage(url);
      }
      await new Promise(r => setTimeout(r, 200));
      updateStep(0, 'complete');

      updateStep(1, 'processing');
      const rawPageImages: HTMLImageElement[] = [];
      for (const pdfFile of pdfFiles) {
        const img = await extractPdfFirstPage(pdfFile);
        rawPageImages.push(img);
      }
      updateStep(1, 'complete');

      updateStep(2, 'processing');
      const strippedImages = await Promise.all(rawPageImages.map(img => removeWhiteBackground(img)));
      await new Promise(r => setTimeout(r, 200));
      updateStep(2, 'complete');

      updateStep(3, 'processing');
      const compositeBlobs: Blob[] = [];
      for (const pageImg of strippedImages) {
        const blob = await renderComposite(bgImg, pageImg, offsetX, offsetY, selectedPaperSize.widthMM, selectedPaperSize.heightMM);
        compositeBlobs.push(blob);
      }
      updateStep(3, 'complete');

      updateStep(4, 'processing');
      const canvasWidthPx = Math.round(selectedPaperSize.widthMM * MM_TO_INCH * DPI);
      const canvasHeightPx = Math.round(selectedPaperSize.heightMM * MM_TO_INCH * DPI);
      const finalPdf = await buildPdfBundle(compositeBlobs, selectedPaperSize.widthMM, selectedPaperSize.heightMM, canvasWidthPx, canvasHeightPx);
      await new Promise(r => setTimeout(r, 200));
      updateStep(4, 'complete');

      const url = URL.createObjectURL(finalPdf);
      setDownloadUrl(url);
    } catch (error) {
      setSteps(prev => prev.map(step =>
        step.status === 'processing'
          ? { ...step, status: 'error', message: error instanceof Error ? error.message : 'Processing failed' }
          : step
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setPdfFiles([]);
    setBackgroundFile(null);
    setBackgroundImg(null);
    setPdfPreviewImg(null);
    setOffsetX(0);
    setOffsetY(0);
    setSteps([]);
    setDownloadUrl(null);
    setIsProcessing(false);
    setPreviewPdfIndex(0);
  };

  const handleCompositeReady = useCallback((canvas: HTMLCanvasElement) => {
    compositeCanvasRef.current = canvas;
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Book Cover Compositor</h2>
        <p className="text-gray-600">
          Compose PDF covers onto a landscape print canvas at 300 DPI
        </p>
      </div>

      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Paper Size (Landscape)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PAPER_SIZES.map((size) => (
            <button
              key={size.name}
              onClick={() => setSelectedPaperSize(size)}
              disabled={isProcessing}
              className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                selectedPaperSize.name === size.name
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-bold">{size.name}</div>
              <div className="text-xs mt-1 opacity-75">
                {size.widthMM} × {size.heightMM} mm
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Selected: {selectedPaperSize.widthMM} × {selectedPaperSize.heightMM} mm ({selectedPaperSize.widthInches.toFixed(2)} × {selectedPaperSize.heightInches.toFixed(2)} in)
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2 text-lg">
              Preview
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Background (left) + PDF cover page (right) — dashed line marks the center fold
            </p>
            <CanvasPreview
              backgroundImage={backgroundImg}
              pdfPageImage={pdfPreviewImg}
              offsetX={offsetX}
              offsetY={offsetY}
              canvasWidthMM={selectedPaperSize.widthMM}
              canvasHeightMM={selectedPaperSize.heightMM}
              onCompositeReady={handleCompositeReady}
            />
            {pdfFiles.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">Preview page:</span>
                <div className="flex gap-1 flex-wrap">
                  {pdfFiles.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewPdfIndex(i)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        previewPdfIndex === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <PositionControls
            offsetX={offsetX}
            offsetY={offsetY}
            onOffsetXChange={setOffsetX}
            onOffsetYChange={setOffsetY}
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-5">
          <FileUploader
            title={`Background Image (${selectedPaperSize.name})`}
            icon={ImageIcon}
            accept=".jpg,.jpeg,.png"
            multiple={false}
            files={backgroundFile ? [backgroundFile] : []}
            onFilesChange={files => setBackgroundFile(files[0] || null)}
            disabled={isProcessing}
          />

          <FileUploader
            title="PDF Cover Files"
            icon={FileText}
            accept=".pdf"
            multiple={true}
            files={pdfFiles}
            onFilesChange={setPdfFiles}
            disabled={isProcessing}
          />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
            <button
              onClick={handleProcess}
              disabled={isProcessing || pdfFiles.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Generate PDF Bundle
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download="book_covers_bundle.pdf"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF Bundle
              </a>
            )}

            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600 mb-2">Output specs</p>
            <p>Canvas: {selectedPaperSize.widthMM} × {selectedPaperSize.heightMM} mm ({selectedPaperSize.name})</p>
            <p>Resolution: 300 DPI</p>
            <p>Size: {Math.round(selectedPaperSize.widthMM * MM_TO_INCH * DPI).toLocaleString()} × {Math.round(selectedPaperSize.heightMM * MM_TO_INCH * DPI).toLocaleString()} px</p>
            <p>PDF cover placed on right half</p>
            <p>All processing runs locally in your browser</p>
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <ProcessingStatus steps={steps} />
      )}
    </div>
  );
}
