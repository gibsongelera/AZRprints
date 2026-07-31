import type { OrderColor, OrderType, Pricing } from "./types";

export type PricingBreakdownLine = {
  key: string;
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type PricingBreakdown = {
  lines: PricingBreakdownLine[];
  total: number;
};

export function calculateOrderBreakdown(
  pricing: Pricing,
  type: OrderType,
  color: OrderColor,
  pages: number,
  copies: number,
  documentPages?: number,
  photoPages?: number
): PricingBreakdown {
  const c = Math.max(1, copies || 1);
  const docP = Math.max(0, documentPages ?? 0);
  const photoP = Math.max(0, photoPages ?? 0);
  const p = Math.max(1, pages || 1);
  const lines: PricingBreakdownLine[] = [];

  if (type === "photo") {
    const unit = Number(pricing.photo);
    lines.push({
      key: "photo",
      label: "Photo print",
      quantity: c,
      unitPrice: unit,
      subtotal: unit * c,
    });
    return { lines, total: lines[0].subtotal };
  }

  const docRate =
    color === "color"
      ? Number(pricing.document_color)
      : Number(pricing.document_bw);
  const photoRate = Number(pricing.photo);

  if (docP > 0 || photoP > 0) {
    if (docP > 0) {
      lines.push({
        key: "document",
        label: color === "color" ? "Document (color)" : "Document (B&W)",
        quantity: docP * c,
        unitPrice: docRate,
        subtotal: docRate * docP * c,
      });
    }
    if (photoP > 0) {
      lines.push({
        key: "photo_pages",
        label: "Photo pages",
        quantity: photoP * c,
        unitPrice: photoRate,
        subtotal: photoRate * photoP * c,
      });
    }
    const total = lines.reduce((s, l) => s + l.subtotal, 0);
    return { lines, total };
  }

  lines.push({
    key: "document",
    label: color === "color" ? "Document (color)" : "Document (B&W)",
    quantity: p * c,
    unitPrice: docRate,
    subtotal: docRate * p * c,
  });
  return { lines, total: lines[0].subtotal };
}

export function calculateOrderAmount(
  pricing: Pricing,
  type: OrderType,
  color: OrderColor,
  pages: number,
  copies: number,
  documentPages?: number,
  photoPages?: number
): number {
  return calculateOrderBreakdown(
    pricing,
    type,
    color,
    pages,
    copies,
    documentPages,
    photoPages
  ).total;
}
