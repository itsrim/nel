import { Sparkles } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import "./ProfileKarmaBadge.css";

interface ProfileKarmaBadgeProps {
  karma: number;
  className?: string;
}

export function ProfileKarmaBadge({ karma, className = "" }: ProfileKarmaBadgeProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`profile-karma-badge ${className}`.trim()}
      aria-label={t("karmaPointsLabel").replace("{count}", String(karma))}
    >
      <Sparkles size={14} aria-hidden />
      <span className="profile-karma-badge-value">{karma}</span>
      <span className="profile-karma-badge-label">{t("karmaShort")}</span>
    </div>
  );
}
