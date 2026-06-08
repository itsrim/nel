import { useMemo, useState } from "react";
import { X, CreditCard, Loader2, Crown, Award } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguageStore } from "../store/useLanguageStore";
import {
  formatMonthlyUnitPrice,
  formatSubscriptionTotal,
  SUBSCRIPTION_MONTH_OPTIONS,
  type SubscriptionMonths,
} from "../lib/subscriptionPricing";
import {
  formatCardExpiry,
  formatCardNumber,
  processCardPayment,
  type SubscriptionPlan,
} from "../lib/subscriptionPayment";
import "./SubscriptionCheckoutModal.css";

interface SubscriptionCheckoutModalProps {
  plan: SubscriptionPlan;
  onClose: () => void;
  onSuccess: (plan: SubscriptionPlan, months: number, transactionId?: string) => void;
}

export function SubscriptionCheckoutModal({
  plan,
  onClose,
  onSuccess,
}: SubscriptionCheckoutModalProps) {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const locale = language === "en" ? "en-GB" : "fr-FR";
  const [months, setMonths] = useState<SubscriptionMonths>(1);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title = plan === "premium" ? t("premium") : t("professional");
  const subtitle = plan === "premium" ? t("premiumSub") : t("professionalSub");
  const PlanIcon = plan === "premium" ? Crown : Award;
  const unitPrice = formatMonthlyUnitPrice(plan, locale);
  const totalPrice = useMemo(
    () => formatSubscriptionTotal(plan, months, locale),
    [plan, months, locale],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await processCardPayment(plan, {
        cardholderName,
        cardNumber,
        expiry,
        cvc,
      });
      if (!result.ok) {
        const errors: Record<string, string> = {
          cardholderRequired: t("cardholderRequired"),
          cardNumberInvalid: t("cardNumberInvalid"),
          cardExpiryInvalid: t("cardExpiryInvalid"),
          cardCvcInvalid: t("cardCvcInvalid"),
          paymentFailed: t("paymentFailed"),
        };
        setError(errors[result.error ?? "paymentFailed"] ?? t("paymentFailed"));
        return;
      }
      onSuccess(plan, months, result.transactionId);
    } catch {
      setError(t("paymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sub-checkout-overlay" onClick={onClose}>
      <div
        className="sub-checkout-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="sub-checkout-title"
      >
        <div className="sub-checkout-header">
          <div className="sub-checkout-plan">
            <span className={`sub-checkout-plan-icon sub-checkout-plan-icon--${plan}`}>
              <PlanIcon size={20} />
            </span>
            <div>
              <h3 id="sub-checkout-title">{title}</h3>
              <p>{subtitle}</p>
            </div>
          </div>
          <button type="button" className="sub-checkout-close" onClick={onClose} aria-label={t("cancel")}>
            <X size={22} />
          </button>
        </div>

        <div className="sub-checkout-duration">
          <span className="sub-checkout-duration-label">{t("subscriptionDuration")}</span>
          <div className="sub-checkout-months" role="group" aria-label={t("subscriptionDuration")}>
            {SUBSCRIPTION_MONTH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`sub-checkout-month-btn${months === n ? " sub-checkout-month-btn--active" : ""}`}
                onClick={() => setMonths(n)}
                aria-pressed={months === n}
              >
                {t("subscriptionMonthsCount").replace("{{n}}", String(n))}
              </button>
            ))}
          </div>
          <p className="sub-checkout-unit-hint">
            {unitPrice} {t("subscriptionPerMonth")}
          </p>
        </div>

        <div className="sub-checkout-price-row">
          <span>
            {t("subscriptionTotal")}{" "}
            <span className="sub-checkout-price-meta">
              ({t("subscriptionMonthsCount").replace("{{n}}", String(months))})
            </span>
          </span>
          <strong>{totalPrice}</strong>
        </div>

        <form className="sub-checkout-form" onSubmit={handleSubmit}>
          <label className="sub-checkout-label">
            {t("cardholderName")}
            <input
              type="text"
              autoComplete="cc-name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder={t("cardholderPlaceholder")}
              required
            />
          </label>

          <label className="sub-checkout-label">
            {t("cardNumber")}
            <div className="sub-checkout-input-icon">
              <CreditCard size={18} aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                required
              />
            </div>
          </label>

          <div className="sub-checkout-row">
            <label className="sub-checkout-label">
              {t("cardExpiry")}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(e) => setExpiry(formatCardExpiry(e.target.value))}
                placeholder="MM/AA"
                required
              />
            </label>
            <label className="sub-checkout-label">
              {t("cardCvc")}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                required
              />
            </label>
          </div>

          <p className="sub-checkout-secure">{t("paymentSecureNote")}</p>

          {error ? <p className="sub-checkout-error">{error}</p> : null}

          <button type="submit" className="sub-checkout-pay-btn" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="sub-checkout-spinner" aria-hidden />
                {t("paymentProcessing")}
              </>
            ) : (
              t("payWithCardBeta")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
