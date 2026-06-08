import type { SubscriptionPlan } from "./subscriptionPayment";

export const SUBSCRIPTION_MONTH_OPTIONS = [1, 3, 6, 12] as const;

export type SubscriptionMonths = (typeof SUBSCRIPTION_MONTH_OPTIONS)[number];

/** Tarif mensuel en euros (affichage + calcul du total). */
export const SUBSCRIPTION_MONTHLY_EUR: Record<SubscriptionPlan, number> = {
  premium: 4.99,
  pro: 14.99,
};

export function formatSubscriptionTotal(
  plan: SubscriptionPlan,
  months: number,
  locale = "fr-FR",
): string {
  const total = SUBSCRIPTION_MONTHLY_EUR[plan] * months;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(total);
}

export function formatMonthlyUnitPrice(
  plan: SubscriptionPlan,
  locale = "fr-FR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(SUBSCRIPTION_MONTHLY_EUR[plan]);
}
