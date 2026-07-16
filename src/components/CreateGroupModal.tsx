import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import "./CreateGroupModal.css";

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError("");
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("createGroupNameRequired"));
      return;
    }
    setError("");
    onCreate(trimmed);
    onClose();
  };

  return createPortal(
    <div
      className="cgm-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cgm-title"
    >
      <div className="cgm-backdrop" onClick={onClose} aria-hidden />
      <div
        className="cgm-panel"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cgm-icon-wrap" aria-hidden>
          <Users size={28} color="#7C9EFF" />
        </div>
        <h2 id="cgm-title" className="cgm-title">
          {t("newGroup")}
        </h2>
        <label className="cgm-label" htmlFor="cgm-name">
          {t("createGroupNamePrompt")}
        </label>
        <input
          ref={inputRef}
          id="cgm-name"
          type="text"
          className="cgm-input"
          value={name}
          placeholder={t("newGroup")}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        {error ? <p className="cgm-error">{error}</p> : null}
        <div className="cgm-actions">
          <button
            type="button"
            className="cgm-btn cgm-btn--ghost"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="cgm-btn cgm-btn--primary"
            onClick={handleSubmit}
          >
            {t("createButton")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
