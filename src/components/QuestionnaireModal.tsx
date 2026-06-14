import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Check } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import "./QuestionnaireModal.css";

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJIS = [
  { emoji: "😄", key: "great" },
  { emoji: "😊", key: "good" },
  { emoji: "😐", key: "ok" },
  { emoji: "😔", key: "low" },
  { emoji: "😢", key: "sad" },
  { emoji: "🥰", key: "loved" },
  { emoji: "😴", key: "tired" },
  { emoji: "😤", key: "tense" },
  { emoji: "🌟", key: "hope" },
];

const BADGE_KEYS = [
  "work",
  "money",
  "help",
  "health",
  "fatigue",
  "pain",
  "happiness",
  "family",
  "love",
  "sports",
  "friends",
  "stress",
  "calm",
  "nature",
  "creativity",
] as const;

type BadgeKey = (typeof BADGE_KEYS)[number];

export function QuestionnaireModal({
  isOpen,
  onClose,
}: QuestionnaireModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const resetForm = useCallback(() => {
    setStep(1);
    setSelectedEmoji(null);
    setSelectedBadge(null);
    setNote("");
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  const complete = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose, resetForm]);

  const goToStep = useCallback((next: 1 | 2 | 3) => {
    setStep(next);
  }, []);

  const handleNext = useCallback(() => {
    setStep((current) => {
      if (current < 3) return (current + 1) as 2 | 3;
      complete();
      return 1;
    });
  }, [complete]);

  const handleSkip = useCallback(() => {
    setStep((current) => {
      if (current < 3) return (current + 1) as 2 | 3;
      complete();
      return 1;
    });
  }, [complete]);

  if (!isOpen) return null;

  return (
    <div className="q-modal-overlay">
      <div className="q-modal-twilight">
        {stars.map((star) => (
          <div
            key={star.id}
            className="q-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      <div className="q-modal-content">
        <header className="q-header">
          <button
            type="button"
            className="q-close-btn"
            onClick={complete}
            aria-label={t("close")}
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div className="q-body">
          <p className="q-kicker">{t("howAreYou")}</p>
          <p className="q-step-badge">
            {t("step")} {step} {t("of")} 3
          </p>

          <h2 className="q-title">
            {step === 1 && t("moodQuestion")}
            {step === 2 && t("mindQuestion")}
            {step === 3 && t("noteQuestion")}
          </h2>

          <p className="q-subtitle">
            {step === 1 && t("moodSubtitle")}
            {step === 2 && t("mindSubtitle")}
            {step === 3 && t("noteSubtitle")}
          </p>

          <div className="q-options-container">
            {step === 1 && (
              <div className="emoji-grid">
                {EMOJIS.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    className={`emoji-btn ${selectedEmoji === e.key ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEmoji(e.key);
                      goToStep(2);
                    }}
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="badge-wrap">
                {BADGE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`badge-chip ${selectedBadge === key ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBadge(key);
                      goToStep(3);
                    }}
                  >
                    {t(key satisfies BadgeKey)}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <textarea
                className="q-textarea"
                placeholder={t("questionPlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </div>

          <div className="q-actions">
            {step === 3 && (
              <button type="button" className="q-primary-btn" onClick={handleNext}>
                {t("continue")} <Check size={22} style={{ marginLeft: 8 }} />
              </button>
            )}
            <button type="button" className="q-skip-btn" onClick={handleSkip}>
              {t("skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
