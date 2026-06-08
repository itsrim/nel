import type { SubscriptionPlan } from "./subscriptionPayment";

export interface SubscriptionPaymentRecord {
  /** Paiement confirmé (auto en bêta, Stripe/PayPlug en prod). */
  paymentValidated: boolean;
  /** Dernier achat : nombre de mois souscrits. */
  months: number | null;
  /** Horodatage du dernier paiement validé. */
  lastPaymentAt: number | null;
  /** Référence transaction (simulée ou PSP). */
  lastTransactionId: string | null;
}

export const SUBSCRIPTION_LS_KEYS: Record<
  SubscriptionPlan,
  {
    paymentValidated: string;
    months: string;
    lastPaymentAt: string;
    lastTransactionId: string;
  }
> = {
  premium: {
    paymentValidated: "nel_viewer_premium_payment_validated",
    months: "nel_viewer_premium_months",
    lastPaymentAt: "nel_viewer_premium_last_payment_at",
    lastTransactionId: "nel_viewer_premium_last_transaction_id",
  },
  pro: {
    paymentValidated: "nel_viewer_pro_payment_validated",
    months: "nel_viewer_pro_months",
    lastPaymentAt: "nel_viewer_pro_last_payment_at",
    lastTransactionId: "nel_viewer_pro_last_transaction_id",
  },
};

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readInt(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw?.trim()) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function readStr(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function readSubscriptionPaymentRecord(
  plan: SubscriptionPlan,
): SubscriptionPaymentRecord {
  const keys = SUBSCRIPTION_LS_KEYS[plan];
  return {
    paymentValidated: readBool(keys.paymentValidated),
    months: readInt(keys.months),
    lastPaymentAt: readInt(keys.lastPaymentAt),
    lastTransactionId: readStr(keys.lastTransactionId),
  };
}

export function writeSubscriptionPaymentRecord(
  plan: SubscriptionPlan,
  record: SubscriptionPaymentRecord,
): void {
  if (typeof window === "undefined") return;
  const keys = SUBSCRIPTION_LS_KEYS[plan];
  try {
    localStorage.setItem(keys.paymentValidated, String(record.paymentValidated));
    if (record.months != null) {
      localStorage.setItem(keys.months, String(record.months));
    } else {
      localStorage.removeItem(keys.months);
    }
    if (record.lastPaymentAt != null) {
      localStorage.setItem(keys.lastPaymentAt, String(record.lastPaymentAt));
    } else {
      localStorage.removeItem(keys.lastPaymentAt);
    }
    if (record.lastTransactionId) {
      localStorage.setItem(keys.lastTransactionId, record.lastTransactionId);
    } else {
      localStorage.removeItem(keys.lastTransactionId);
    }
  } catch {
    /* ignore */
  }
}

export function clearSubscriptionPaymentRecord(plan: SubscriptionPlan): void {
  writeSubscriptionPaymentRecord(plan, {
    paymentValidated: false,
    months: null,
    lastPaymentAt: null,
    lastTransactionId: null,
  });
}
