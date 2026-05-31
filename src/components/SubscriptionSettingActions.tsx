import { useTranslation } from "../i18n/useTranslation";
import { formatSubscriptionEnd } from "../lib/subscriptionDates";
import type { SubscriptionPlan } from "../lib/subscriptionPayment";

interface SubscriptionSettingActionsProps {
  plan: SubscriptionPlan;
  active: boolean;
  expiresAt: number | null;
  priceLabel: string;
  locale: string;
  onSubscribe: () => void;
  onCancel: () => void;
}

export function SubscriptionSettingActions({
  plan,
  active,
  expiresAt,
  priceLabel,
  locale,
  onSubscribe,
  onCancel,
}: SubscriptionSettingActionsProps) {
  const { t } = useTranslation();

  if (!active) {
    return (
      <button
        type="button"
        className={`setting-subscribe-btn${plan === "pro" ? " setting-subscribe-btn--pro" : ""}`}
        onClick={onSubscribe}
      >
        {t("subscribe")} · {priceLabel}
      </button>
    );
  }

  return (
    <div className="setting-subscription-actions">
      <span className="setting-status setting-status--active">{t("subscriptionActive")}</span>
      {expiresAt != null ? (
        <span className="setting-subscription-until">
          {t("subscriptionUntil")}{" "}
          {formatSubscriptionEnd(expiresAt, locale)}
        </span>
      ) : (
        <span className="setting-subscription-until">{t("subscriptionUntilUnknown")}</span>
      )}
      <button type="button" className="setting-cancel-sub-btn" onClick={onCancel}>
        {t("cancelSubscription")}
      </button>
    </div>
  );
}
