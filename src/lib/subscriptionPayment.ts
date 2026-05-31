export type SubscriptionPlan = "premium" | "pro";

export interface CardPaymentInput {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface CardPaymentResult {
  ok: boolean;
  error?: string;
  transactionId?: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isExpiryValid(expiry: string): boolean {
  const m = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expEnd = new Date(year, month, 0, 23, 59, 59);
  return expEnd >= now;
}

/** Simulation paiement CB — prêt à brancher Stripe / PayPlug plus tard. */
export async function processCardPayment(
  plan: SubscriptionPlan,
  input: CardPaymentInput,
): Promise<CardPaymentResult> {
  const name = input.cardholderName.trim();
  const number = digitsOnly(input.cardNumber);
  const cvc = digitsOnly(input.cvc);

  if (name.length < 2) {
    return { ok: false, error: "cardholderRequired" };
  }
  if (number.length < 13 || number.length > 19) {
    return { ok: false, error: "cardNumberInvalid" };
  }
  if (!isExpiryValid(input.expiry)) {
    return { ok: false, error: "cardExpiryInvalid" };
  }
  if (cvc.length < 3 || cvc.length > 4) {
    return { ok: false, error: "cardCvcInvalid" };
  }

  await new Promise((r) => setTimeout(r, 900));

  const transactionId = `nel_${plan}_${Date.now().toString(36)}`;
  return { ok: true, transactionId };
}

export function formatCardNumber(value: string): string {
  const d = digitsOnly(value).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatCardExpiry(value: string): string {
  const d = digitsOnly(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
