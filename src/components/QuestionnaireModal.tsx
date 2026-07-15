import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Check } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";
import type { QuestionnaireResponse } from "../lib/questionnaireDaily";
import {
  formatQuestionnaireEntryDate,
  getLastWeekQuestionnaireEntry,
  getPastQuestionnaireEntries,
  type QuestionnaireDailyEntry,
} from "../lib/questionnaireDaily";
import "./QuestionnaireModal.css";

interface QuestionnaireModalProps {
  isOpen: boolean;
  userId?: string | null;
  onClose: (response?: QuestionnaireResponse) => void;
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
  "sex",
] as const;

type BadgeKey = (typeof BADGE_KEYS)[number];

const EMOJI_BY_KEY = Object.fromEntries(
  EMOJIS.map((entry) => [entry.key, entry.emoji]),
) as Record<string, string>;

function hasMood(entry: QuestionnaireDailyEntry): boolean {
  return Boolean(entry.emoji || entry.badge);
}

function QuestionnairePastEntry({
  entry,
  t,
  language,
  showLastWeekTag = false,
}: {
  entry: QuestionnaireDailyEntry;
  t: (key: TranslationKey) => string;
  language: string;
  showLastWeekTag?: boolean;
}) {
  const emojiChar = entry.emoji ? EMOJI_BY_KEY[entry.emoji] : null;
  const badgeLabel =
    entry.badge && BADGE_KEYS.includes(entry.badge as BadgeKey)
      ? t(entry.badge as BadgeKey)
      : entry.badge;

  return (
    <article className="q-past-entry">
      <div className="q-past-entry-head">
        <time className="q-past-entry-date">
          {formatQuestionnaireEntryDate(entry.date, language)}
        </time>
        {showLastWeekTag ? (
          <span className="q-past-week-tag">{t("questionnaireLastWeekTag")}</span>
        ) : null}
      </div>
      {hasMood(entry) ? (
        <p className="q-past-entry-mood">
          {emojiChar ? <span aria-hidden>{emojiChar}</span> : null}
          {emojiChar && badgeLabel ? (
            <span className="q-past-entry-sep" aria-hidden>
              ·
            </span>
          ) : null}
          {badgeLabel ? <span>{badgeLabel}</span> : null}
        </p>
      ) : null}
      {entry.note ? <p className="q-past-entry-note">« {entry.note} »</p> : null}
    </article>
  );
}

export function QuestionnaireModal({
  isOpen,
  userId,
  onClose,
}: QuestionnaireModalProps) {
  const { t, language } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pastEntries, setPastEntries] = useState<QuestionnaireDailyEntry[]>([]);
  const [lastWeekEntry, setLastWeekEntry] =
    useState<QuestionnaireDailyEntry | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setSelectedEmoji(null);
    setSelectedBadge(null);
    setNote("");
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen || !userId) {
      setPastEntries([]);
      setLastWeekEntry(null);
      return;
    }
    setPastEntries(getPastQuestionnaireEntries(userId));
    setLastWeekEntry(getLastWeekQuestionnaireEntry(userId));
  }, [isOpen, userId, step]);

  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  const complete = useCallback(
    (response?: QuestionnaireResponse) => {
      onClose(response);
      resetForm();
    },
    [onClose, resetForm],
  );

  const buildResponse = useCallback((): QuestionnaireResponse | undefined => {
    const trimmedNote = note.trim();
    if (!selectedEmoji && !selectedBadge && !trimmedNote) return undefined;
    return {
      emoji: selectedEmoji,
      badge: selectedBadge,
      note: trimmedNote,
    };
  }, [note, selectedBadge, selectedEmoji]);

  const goToStep = useCallback((next: 1 | 2 | 3) => {
    setStep(next);
  }, []);

  const handleNext = useCallback(() => {
    setStep((current) => {
      if (current < 3) return (current + 1) as 2 | 3;
      complete(buildResponse());
      return 1;
    });
  }, [buildResponse, complete]);

  const handleSkip = useCallback(() => {
    setStep((current) => {
      if (current < 3) return (current + 1) as 2 | 3;
      complete(buildResponse());
      return 1;
    });
  }, [buildResponse, complete]);

  if (!isOpen) return null;

  const recentEntries = pastEntries.filter(
    (entry) => entry.date !== lastWeekEntry?.date,
  );

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
            onClick={() => complete(buildResponse())}
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
              <div className="q-note-step">
                <textarea
                  className="q-textarea"
                  placeholder={t("questionPlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {lastWeekEntry && hasMood(lastWeekEntry) ? (
                  <section className="q-past-notes" aria-label={t("questionnaireLastWeekMood")}>
                    <p className="q-past-label">{t("questionnaireLastWeekMood")}</p>
                    <QuestionnairePastEntry
                      entry={lastWeekEntry}
                      t={t}
                      language={language}
                      showLastWeekTag
                    />
                  </section>
                ) : null}
                {recentEntries.length > 0 ? (
                  <section
                    className="q-past-notes"
                    aria-label={t("questionnaireRecentNotes")}
                  >
                    <p className="q-past-label">{t("questionnaireRecentNotes")}</p>
                    {recentEntries.map((entry) => (
                      <QuestionnairePastEntry
                        key={entry.date}
                        entry={entry}
                        t={t}
                        language={language}
                      />
                    ))}
                  </section>
                ) : null}
              </div>
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
