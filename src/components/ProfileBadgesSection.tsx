import { useState, useRef, useEffect } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import "./ProfileBadgesSection.css";

interface ProfileBadgesSectionProps {
  badges: string[];
  suggestions: string[];
  editable?: boolean;
  manageSuggestions?: boolean;
  onChange?: (badges: string[]) => void;
  onSuggestionsChange?: (suggestions: string[]) => void;
  className?: string;
  chipClassName?: string;
}

export function ProfileBadgesSection({
  badges,
  suggestions,
  editable = false,
  manageSuggestions = false,
  onChange,
  onSuggestionsChange,
  className = "badges-grid",
  chipClassName = "badge-chip",
}: ProfileBadgesSectionProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [addingCatalog, setAddingCatalog] = useState(false);
  const [catalogDraft, setCatalogDraft] = useState("");
  const [editingCatalogLabel, setEditingCatalogLabel] = useState<string | null>(
    null,
  );
  const [editingCatalogDraft, setEditingCatalogDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);
  const catalogEditRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (addingCatalog) catalogInputRef.current?.focus();
  }, [addingCatalog]);

  useEffect(() => {
    if (editingCatalogLabel) catalogEditRef.current?.focus();
  }, [editingCatalogLabel]);

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

  const addSuggestionToProfile = (label: string) => {
    if (!onChange) return;
    if (badges.some((b) => b.toLowerCase() === label.toLowerCase())) return;
    onChange([...badges, label]);
  };

  const commitCatalogAdd = () => {
    const label = catalogDraft.trim();
    setCatalogDraft("");
    setAddingCatalog(false);
    if (!label || !onSuggestionsChange) return;
    if (suggestions.some((s) => s.toLowerCase() === label.toLowerCase())) return;
    onSuggestionsChange([...suggestions, label]);
  };

  const removeCatalogSuggestion = (label: string) => {
    if (!onSuggestionsChange) return;
    onSuggestionsChange(suggestions.filter((s) => s !== label));
  };

  const startCatalogEdit = (label: string) => {
    setEditingCatalogLabel(label);
    setEditingCatalogDraft(label);
  };

  const commitCatalogEdit = () => {
    if (!editingCatalogLabel || !onSuggestionsChange) return;
    const next = editingCatalogDraft.trim();
    setEditingCatalogLabel(null);
    setEditingCatalogDraft("");
    if (!next || next === editingCatalogLabel) return;
    if (
      suggestions.some(
        (s) =>
          s !== editingCatalogLabel && s.toLowerCase() === next.toLowerCase(),
      )
    ) {
      return;
    }
    onSuggestionsChange(
      suggestions.map((s) => (s === editingCatalogLabel ? next : s)),
    );
    if (onChange && badges.includes(editingCatalogLabel)) {
      onChange(
        badges.map((b) => (b === editingCatalogLabel ? next : b)),
      );
    }
  };

  const availableSuggestions = suggestions.filter(
    (s) => !badges.some((b) => b.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="profile-badges-section">
      {editable ? (
        <p className="badge-admin-hint">{t("badgeAdminHint")}</p>
      ) : null}
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

      {editable && (manageSuggestions || availableSuggestions.length > 0) ? (
        <div className="badge-catalog-block">
          <p className="badge-catalog-title">
            {manageSuggestions ? t("badgeCatalogTitle") : t("badgeQuickAddTitle")}
          </p>
          <div className="badge-suggestions">
            {(manageSuggestions ? suggestions : availableSuggestions).map((s) => {
              const onProfile = badges.some(
                (b) => b.toLowerCase() === s.toLowerCase(),
              );
              if (editingCatalogLabel === s) {
                return (
                  <div key={s} className="badge-catalog-item badge-catalog-item--edit">
                    <input
                      ref={catalogEditRef}
                      type="text"
                      className="badge-catalog-edit-input"
                      value={editingCatalogDraft}
                      maxLength={32}
                      onChange={(e) => setEditingCatalogDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitCatalogEdit();
                        }
                        if (e.key === "Escape") {
                          setEditingCatalogLabel(null);
                          setEditingCatalogDraft("");
                        }
                      }}
                      onBlur={commitCatalogEdit}
                    />
                  </div>
                );
              }
              return (
                <div key={s} className="badge-catalog-item">
                  <button
                    type="button"
                    className={`badge-suggestion-btn${onProfile ? " badge-suggestion-btn--on-profile" : ""}`}
                    onClick={() => addSuggestionToProfile(s)}
                    disabled={onProfile}
                  >
                    + {s}
                  </button>
                  {manageSuggestions ? (
                    <>
                      <button
                        type="button"
                        className="badge-catalog-action"
                        onClick={() => startCatalogEdit(s)}
                        aria-label={`${t("badgeEditAria")} ${s}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="badge-catalog-action badge-catalog-action--danger"
                        onClick={() => removeCatalogSuggestion(s)}
                        aria-label={`${t("badgeRemoveCatalogAria")} ${s}`}
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
            {manageSuggestions ? (
              addingCatalog ? (
                <div className="badge-catalog-item badge-catalog-item--edit">
                  <input
                    ref={catalogInputRef}
                    type="text"
                    className="badge-catalog-edit-input"
                    value={catalogDraft}
                    placeholder={t("badgeCatalogAddPlaceholder")}
                    maxLength={32}
                    onChange={(e) => setCatalogDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitCatalogAdd();
                      }
                      if (e.key === "Escape") {
                        setCatalogDraft("");
                        setAddingCatalog(false);
                      }
                    }}
                    onBlur={() => {
                      if (catalogDraft.trim()) commitCatalogAdd();
                      else setAddingCatalog(false);
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="badge-suggestion-btn badge-suggestion-btn--add-catalog"
                  onClick={() => setAddingCatalog(true)}
                >
                  + {t("badgeCatalogAdd")}
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
