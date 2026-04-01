export const DPI = 300;

export const CARD_SHEET_PAPER_SIZES = {
  'a4': { width: 210, height: 297 },
  'letter': { width: 215.9, height: 279.4 },
  'legal': { width: 215.9, height: 355.6 },
  'a3': { width: 297, height: 420 },
  '12x18': { width: 304.8, height: 457.2 },
  '13x19': { width: 330.2, height: 482.6 }
};

export const PDF_TOOL_PAPER_SIZES_POINTS = {
  letter: [11 * 72, 8.5 * 72],
  legal: [14 * 72, 8.5 * 72],
  a4: [297 * 2.835, 210 * 2.835],
  a3: [420 * 2.835, 297 * 2.835],
  a5: [210 * 2.835, 148 * 2.835],
  a6: [148 * 2.835, 105 * 2.835],
  b3: [500 * 2.835, 353 * 2.835],
  b4: [353 * 2.835, 250 * 2.835],
  b5: [250 * 2.835, 176 * 2.835],
  b6: [176 * 2.835, 125 * 2.835],
  tabloid: [17 * 72, 11 * 72],
  '12x18': [18 * 72, 12 * 72],
  '13x19': [19 * 72, 13 * 72],
  '11x17': [17 * 72, 11 * 72],
  '8.5x14': [14 * 72, 8.5 * 72],
  '9x12': [12 * 72, 9 * 72],
  '16x20': [20 * 72, 16 * 72],
  '18x24': [24 * 72, 18 * 72],
  '24x36': [36 * 72, 24 * 72]
};

export const CM_TO_POINTS = 28.3465;
export const MM_TO_POINTS = 2.83465;

export const SINGLE_IMAGE_POSITIONS = [
  { value: 'top-left', label: 'Top-Left' },
  { value: 'top-center', label: 'Top-Center' },
  { value: 'top-right', label: 'Top-Right' },
  { value: 'middle-left', label: 'Middle-Left' },
  { value: 'middle-center', label: 'Middle-Center' },
  { value: 'middle-right', label: 'Middle-Right' },
  { value: 'bottom-left', label: 'Bottom-Left' },
  { value: 'bottom-center', label: 'Bottom-Center' },
  { value: 'bottom-right', label: 'Bottom-Right' }
];

export const PAGE_NUMBER_POSITIONS = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' }
];

export const FONTS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'TimesRoman', label: 'Times New Roman' },
  { value: 'Courier', label: 'Courier' }
];

export const BOOK_PAGE_SIZES = {
  'a4': { width: 210, height: 297 },
  'a5': { width: 148, height: 210 },
  'a6': { width: 105, height: 148 },
  'letter': { width: 215.9, height: 279.4 },
  'half-letter': { width: 139.7, height: 215.9 },
  'custom': { width: 0, height: 0 }
};

export const OUTPUT_PAPER_SIZES = {
  'a3': { width: 297, height: 420 },
  'a4': { width: 210, height: 297 },
  'letter': { width: 215.9, height: 279.4 },
  'legal': { width: 215.9, height: 355.6 },
  'tabloid': { width: 279.4, height: 431.8 },
  '12x18': { width: 304.8, height: 457.2 },
  '13x19': { width: 330.2, height: 482.6 },
  'custom': { width: 0, height: 0 }
};