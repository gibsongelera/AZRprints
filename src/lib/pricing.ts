import type { OrderColor, OrderType, Pricing } from "./types";

export function calculateOrderAmount(
  pricing: Pricing,
  type: OrderType,
  color: OrderColor,
  pages: number,
  copies: number
): number {
  const p = Math.max(1, pages || 1);
  const c = Math.max(1, copies || 1);

  if (type === "photo") return Number(pricing.photo) * c;
  if (type === "large") return Number(pricing.large_format) * c;

  const rate =
    color === "color"
      ? Number(pricing.document_color)
      : Number(pricing.document_bw);
  return rate * p * c;
}
