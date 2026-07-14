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

export function getEventPriceEuros(priceLabel?: string): number {
  const { isFree, amount } = parseEventPriceState(priceLabel);
  if (isFree) return 0;
  const n = parseFloat(amount.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getEventJoinTipEuros(event: {
  joinTipEnabled?: boolean;
  joinTipAmount?: number;
}): number {
  if (event.joinTipEnabled !== true) return 0;
  if (typeof event.joinTipAmount !== "number" || event.joinTipAmount < 1) return 0;
  return Math.min(5, Math.max(1, Math.round(event.joinTipAmount)));
}

/** Montant à payer à l'inscription : uniquement le pourboire (pas le tarif de la sortie). */
export function getEventJoinPaymentEuros(event: {
  joinTipEnabled?: boolean;
  joinTipAmount?: number;
}): number {
  return getEventJoinTipEuros(event);
}

export function formatEventJoinPaymentLabel(amountEuros: number): string {
  if (amountEuros <= 0) return "Gratuit";
  return Number.isInteger(amountEuros)
    ? `${amountEuros}€`
    : `${amountEuros.toFixed(2).replace(".", ",")}€`;
}

export function eventRequiresJoinPayment(event: {
  joinTipEnabled?: boolean;
  joinTipAmount?: number;
}): boolean {
  return getEventJoinTipEuros(event) > 0;
}

export function viewerHasPaidEventJoin(
  event: { joinTipPaidProfilIds?: string[] },
  viewerId: string | null | undefined,
  viewerProfilId = "__viewer__",
): boolean {
  const pid = viewerId?.trim() || viewerProfilId;
  return (event.joinTipPaidProfilIds ?? []).includes(pid);
}

export function viewerNeedsJoinPayment(
  event: {
    joinTipEnabled?: boolean;
    joinTipAmount?: number;
    joinTipPaidProfilIds?: string[];
  },
  viewerId: string | null | undefined,
  viewerProfilId = "__viewer__",
): boolean {
  if (!eventRequiresJoinPayment(event)) return false;
  return !viewerHasPaidEventJoin(event, viewerId, viewerProfilId);
}
