export function formatPHP(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  return (
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function parsePHP(str: string | number): number {
  if (typeof str === "number") return str;
  return parseFloat(String(str).replace(/[₱,\s]/g, "")) || 0;
}
