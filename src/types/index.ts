export interface PaperSize {
  width: number;
  height: number;
}

export interface CardSheetSettings {
  paperType: string;
  unit: 'mm' | 'cm' | 'in';
  cardWidth: number;
  cardHeight: number;
  cardsPerRow: number;
  cardsPerColumn: number;
  rowGap: number;
  colGap: number;
  includeCropMarks: boolean;
  singleImagePosition: string;
  singleMarginTop: number;
  singleMarginBottom: number;
  singleMarginLeft: number;
  singleMarginRight: number;
  cloneAndFill: boolean; // New option for cloning single image
  rotationAngle: 0 | 90 | 180 | 270; // Rotation angle in degrees
  bleed: number; // Bleed in pixels
  cuttingOffset: number; // Cutting offset value
  cuttingOffsetUnit: 'mm' | 'px'; // Cutting offset unit
  useMixedLayout: boolean; // Mixed orientation layout
  mixedHorizontalCards: number; // Number of horizontal cards at bottom
  frontBackPrinting: boolean; // Fill page 1 with image 1, page 2 with image 2
  pageMargin: number; // Page margin in mm (applied on all sides)
}

export interface PdfManipulationSettings {
  mode: string;
  paperSize: string;
  borderThickness?: number;
  marginScope?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  evenMargins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  drawFrame?: boolean;
  pageNumberSettings?: {
    position: string;
    fontSize: number;
    font: string;
    startNumber: number;
    format: string;
    adjustX: number;
    adjustY: number;
    useCustomPosition?: boolean;
    customX?: number;
    customY?: number;
  };
  splitSettings?: {
    method: string;
    range?: string;
    fixedPages?: number;
  };
  mergeSettings?: {
    addBlankOnOdd: boolean;
  };
  imageSettings?: {
    quality: string;
    customQuality?: number;
    pageSize: string;
    fit: string;
  };
  pdfToImageSettings?: {
    format: string;
    dpi: string;
    quality: string; // for JPEG only
  };
}

export interface BulkImageSplitterSettings {
  numberOfParts: number;
  splitPercentage: number;
  splitDirection: 'horizontal' | 'vertical';
}

export interface StatusMessage {
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface BookWrapperSettings {
  bookPageSize: string;
  customBookWidth?: number;
  customBookHeight?: number;
  outputPaperSize: string;
  customOutputWidth?: number;
  customOutputHeight?: number;
  unit: 'mm' | 'cm' | 'in';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  centerHorizontally: boolean;
  centerVertically: boolean;
  enableSpine?: boolean;
  spineWidth?: number;
  spineTickLength?: number;
  spineOverlap?: number;
}

export interface OCRSettings {
  engine: 'tesseract' | 'gemini' | 'deepseek' | 'openrouter';
  language: string;
  outputFormat: 'text' | 'json';
  apiKey?: string;
  model?: string;
  confidence?: number;
}
export interface IntelligenceCollageSettings {
  paperSize: string;
  customWidth?: number;
  customHeight?: number;
  unit: 'mm' | 'cm' | 'in';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  outputFormat: 'pdf' | 'jpg';
  allowRotation: boolean;
  spacing: number;
  quality: number;
}</parameter>