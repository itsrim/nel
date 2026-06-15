export function parseEventPriceState(priceLabel?: string): {
  isFree: boolean;
  amount: string;
} {
  const raw = priceLabel?.trim() ?? "";
  if (!raw || /^gratuit$/i.test(raw) || /^free$/i.test(raw) || raw === "0" || raw === "0€") {
    return { isFree: true, amount: "" };
  }
  const m = raw.match(/^(\d+(?:[.,]\d+)?)/);
  return { isFree: false, amount: m ? m[1].replace(",", ".") : "" };
}

export function formatEventPriceLabel(isFree: boolean, amountRaw: string): string | null {
  if (isFree) return "Gratuit";
  const n = parseFloat(amountRaw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number.isInteger(n) ? `${n}€` : `${n.toFixed(2).replace(".", ",")}€`;
}

export function isPaidEventPrice(priceLabel?: string): boolean {
  return !parseEventPriceState(priceLabel).isFree;
}
