import { useState, useMemo } from "react";
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
];

export function QuestionnaireModal({
  isOpen,
  onClose,
}: QuestionnaireModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Generate random stars for the background
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else {
      // Complete
      onClose();
      setStep(1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

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
          <div className="q-header-spacer" />
          <button className="q-close-btn" onClick={onClose}>
            <X size={30} color="#fff" />
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
                    className={`emoji-btn ${selectedEmoji === e.key ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEmoji(e.key);
                      handleNext();
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
                    className={`badge-chip ${selectedBadge === key ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBadge(key);
                      handleNext();
                    }}
                  >
                    {t(key as any)}
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
              <button className="q-primary-btn" onClick={handleNext}>
                {t("continue")} <Check size={22} style={{ marginLeft: 8 }} />
              </button>
            )}
            <button className="q-skip-btn" onClick={handleSkip}>
              {t("skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
