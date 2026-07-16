import { useEffect, useId, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import {
  KARMA_ATTENDANCE_REWARD,
  KARMA_JOIN_COST,
  KARMA_ORGANIZE_COST,
  KARMA_ORGANIZE_SUCCESS_REWARD,
  KARMA_PRO_START_BONUS,
} from "../lib/karma";
import "./ProfileKarmaBadge.css";

interface ProfileKarmaBadgeProps {
  karma: number;
  className?: string;
}

function formatKarmaTooltip(template: string): string {
  return template
    .replace("{organizeCost}", String(KARMA_ORGANIZE_COST))
    .replace("{joinCost}", String(KARMA_JOIN_COST))
    .replace("{organizeReward}", String(KARMA_ORGANIZE_SUCCESS_REWARD))
    .replace("{attendanceReward}", String(KARMA_ATTENDANCE_REWARD))
    .replace("{proBonus}", String(KARMA_PRO_START_BONUS));
}

export function ProfileKarmaBadge({ karma, className = "" }: ProfileKarmaBadgeProps) {
  const { t } = useTranslation();
  const tooltipId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    if (!tooltipOpen) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent &&
        wrapRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setTooltipOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [tooltipOpen]);

  return (
    <div
      ref={wrapRef}
      className={`profile-karma-badge-wrap ${className}`.trim()}
    >
      <button
        type="button"
        className="profile-karma-badge"
        aria-label={t("karmaPointsLabel").replace("{count}", String(karma))}
        aria-expanded={tooltipOpen}
        aria-describedby={tooltipOpen ? tooltipId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setTooltipOpen((open) => !open);
        }}
      >
        <Sparkles size={14} aria-hidden />
        <span className="profile-karma-badge-value">{karma}</span>
        <span className="profile-karma-badge-label">{t("karmaShort")}</span>
      </button>
      {tooltipOpen ? (
        <div id={tooltipId} className="profile-karma-tooltip" role="tooltip">
          {formatKarmaTooltip(t("karmaTooltip"))}
        </div>
      ) : null}
    </div>
  );
}
