import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import { PROFILE_BADGE_SUGGESTIONS } from "../constants/profileBadges";

interface ProfileBadgesSectionProps {
  badges: string[];
  editable?: boolean;
  onChange?: (badges: string[]) => void;
  className?: string;
  chipClassName?: string;
}

export function ProfileBadgesSection({
  badges,
  editable = false,
  onChange,
  className = "badges-grid",
  chipClassName = "badge-chip",
}: ProfileBadgesSectionProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commitAdd = () => {
    const label = draft.trim();
    setDraft("");
    setAdding(false);
    if (!label || !onChange) return;
    if (badges.some((b) => b.toLowerCase() === label.toLowerCase())) return;
    onChange([...badges, label]);
  };

  const removeBadge = (label: string) => {
    if (!onChange) return;
    onChange(badges.filter((b) => b !== label));
  };

  const suggestions = PROFILE_BADGE_SUGGESTIONS.filter(
    (s) => !badges.some((b) => b.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      <div className={className}>
        {badges.map((label) => (
          <div key={label} className={chipClassName}>
            <span>{label}</span>
            {editable ? (
              <button
                type="button"
                className="badge-chip-remove"
                onClick={() => removeBadge(label)}
                aria-label={`${t("badgeRemoveAria")} ${label}`}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        ))}
        {editable ? (
          adding ? (
            <div className={`${chipClassName} badge-chip--input`}>
              <input
                ref={inputRef}
                type="text"
                className="badge-chip-input"
                value={draft}
                placeholder={t("badgeAddPlaceholder")}
                maxLength={32}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitAdd();
                  }
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                onBlur={() => {
                  if (draft.trim()) commitAdd();
                  else setAdding(false);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className={`${chipClassName} badge-chip--add`}
              onClick={() => setAdding(true)}
              aria-label={t("badgeAddAria")}
            >
              <Plus size={14} />
            </button>
          )
        ) : null}
      </div>
      {editable && suggestions.length > 0 ? (
        <div className="badge-suggestions">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              className="badge-suggestion-btn"
              onClick={() => onChange?.([...badges, s])}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
