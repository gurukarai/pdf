import { CARD_SHEET_PAPER_SIZES } from '../constants';

export interface LayoutSuggestion {
  label: string;
  cardsPerRow: number;
  cardsPerColumn: number;
  useMixedLayout: boolean;
  mixedHorizontalCards: number;
  totalCards: number;
  rotated: boolean;
  efficiency: number;
  description: string;
}

const MM_PER_UNIT: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

function toMm(value: number, unit: string): number {
  return value * (MM_PER_UNIT[unit] ?? 1);
}

function computeStandardLayout(
  paperW: number,
  paperH: number,
  cardW: number,
  cardH: number,
  gap: number
): { cols: number; rows: number } {
  const cols = Math.max(1, Math.floor((paperW + gap) / (cardW + gap)));
  const rows = Math.max(1, Math.floor((paperH + gap) / (cardH + gap)));
  return { cols, rows };
}

export function computeAutoLayouts(
  paperType: string,
  cardWidthUser: number,
  cardHeightUser: number,
  unit: string,
  rowGapUser: number,
  colGapUser: number,
  pageMarginMm: number = 0
): LayoutSuggestion[] {
  const paper = CARD_SHEET_PAPER_SIZES[paperType as keyof typeof CARD_SHEET_PAPER_SIZES];
  if (!paper) return [];

  const paperW = paper.width - pageMarginMm * 2;
  const paperH = paper.height - pageMarginMm * 2;
  const cardW = toMm(cardWidthUser, unit);
  const cardH = toMm(cardHeightUser, unit);
  const rowGap = toMm(rowGapUser, unit);
  const colGap = toMm(colGapUser, unit);
  const paperArea = paperW * paperH;

  if (cardW <= 0 || cardH <= 0) return [];

  const suggestions: LayoutSuggestion[] = [];
  const seen = new Set<string>();

  const addSuggestion = (s: LayoutSuggestion) => {
    const key = `${s.cardsPerRow}x${s.cardsPerColumn}-${s.useMixedLayout ? s.mixedHorizontalCards : 0}-${s.rotated}`;
    if (!seen.has(key) && s.totalCards > 0) {
      seen.add(key);
      suggestions.push(s);
    }
  };

  const cardArea = cardW * cardH;
  const rotatedCardArea = cardH * cardW;

  // 1. Standard layout — portrait cards
  {
    const { cols, rows } = computeStandardLayout(paperW, paperH, cardW, cardH, colGap);
    const total = cols * rows;
    const efficiency = Math.round(((total * cardArea) / paperArea) * 100);
    addSuggestion({
      label: `${cols} × ${rows} grid (${total} cards)`,
      cardsPerRow: cols,
      cardsPerColumn: rows,
      useMixedLayout: false,
      mixedHorizontalCards: 0,
      totalCards: total,
      rotated: false,
      efficiency,
      description: `Standard portrait grid: ${cols} columns × ${rows} rows`
    });
  }

  // 2. Standard layout — rotated cards (landscape)
  if (cardW !== cardH) {
    const { cols, rows } = computeStandardLayout(paperW, paperH, cardH, cardW, colGap);
    const total = cols * rows;
    const efficiency = Math.round(((total * rotatedCardArea) / paperArea) * 100);
    addSuggestion({
      label: `${cols} × ${rows} grid rotated (${total} cards)`,
      cardsPerRow: cols,
      cardsPerColumn: rows,
      useMixedLayout: false,
      mixedHorizontalCards: 0,
      totalCards: total,
      rotated: true,
      efficiency,
      description: `Rotated 90° landscape grid: ${cols} columns × ${rows} rows`
    });
  }

  // 3. Mixed layout: vertical cards in upper grid + horizontal (rotated) cards at bottom
  //    Try reasonable combinations of vertical grid rows
  if (cardW !== cardH) {
    const hCardW = cardH; // rotated width
    const hCardH = cardW; // rotated height

    const maxVertRows = Math.floor((paperH + rowGap) / (cardH + rowGap));
    const maxVertCols = Math.floor((paperW + colGap) / (cardW + colGap));

    for (let vRows = 1; vRows <= maxVertRows; vRows++) {
      const vertGridH = vRows * cardH + (vRows > 1 ? (vRows - 1) * rowGap : 0);
      const remainingH = paperH - vertGridH - rowGap;
      if (remainingH < hCardH * 0.5) continue;

      const hCols = Math.floor((paperW + colGap) / (hCardW + colGap));
      if (hCols < 1) continue;

      for (let vCols = 1; vCols <= maxVertCols; vCols++) {
        const vertCards = vCols * vRows;
        const hCards = hCols;
        const total = vertCards + hCards;

        const efficiency = Math.round(
          ((vertCards * cardArea + hCards * rotatedCardArea) / paperArea) * 100
        );

        addSuggestion({
          label: `Mixed: ${vCols}×${vRows} + ${hCards} horiz (${total} cards)`,
          cardsPerRow: vCols,
          cardsPerColumn: vRows,
          useMixedLayout: true,
          mixedHorizontalCards: hCards,
          totalCards: total,
          rotated: false,
          efficiency,
          description: `${vCols}×${vRows} vertical cards + ${hCards} horizontal cards at bottom`
        });
      }
    }
  }

  // Sort by totalCards descending, then efficiency descending
  suggestions.sort((a, b) => {
    if (b.totalCards !== a.totalCards) return b.totalCards - a.totalCards;
    return b.efficiency - a.efficiency;
  });

  // Return top 8 unique suggestions
  return suggestions.slice(0, 8);
}
