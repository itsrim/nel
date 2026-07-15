const LS_KEY_PREFIX = "nel_questionnaire_last_shown_";
const LS_RESPONSES_PREFIX = "nel_questionnaire_responses_";
const MAX_RETENTION_DAYS = 7;

export interface QuestionnaireResponse {
  emoji: string | null;
  badge: string | null;
  note: string;
}

export interface QuestionnaireDailyEntry extends QuestionnaireResponse {
  date: string;
}

function todayLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysSinceQuestionnaireEntry(dateKey: string): number | null {
  const entryDate = parseDateKey(dateKey);
  if (!entryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  entryDate.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - entryDate.getTime()) / 86_400_000);
}

export function formatQuestionnaireEntryDate(
  dateKey: string,
  locale: string,
): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  return parsed.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
  });
}

/** Entrée d'il y a environ une semaine (6 jours ou plus), si elle existe. */
export function getLastWeekQuestionnaireEntry(
  userId: string | null | undefined,
): QuestionnaireDailyEntry | null {
  if (!userId) return null;
  const today = todayLocalDateKey();
  const candidates = getQuestionnaireResponses(userId).filter(
    (entry) => entry.date !== today,
  );
  const weekAgo = candidates
    .filter((entry) => {
      const days = daysSinceQuestionnaireEntry(entry.date);
      return days != null && days >= 6;
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (weekAgo) return weekAgo;
  return null;
}

/** Réponses passées (hors jour en cours), du plus récent au plus ancien. */
export function getPastQuestionnaireEntries(
  userId: string | null | undefined,
): QuestionnaireDailyEntry[] {
  if (!userId) return [];
  const today = todayLocalDateKey();
  return getQuestionnaireResponses(userId).filter(
    (entry) => entry.date !== today,
  );
}

function isWithinRetentionWindow(dateKey: string): boolean {
  const entryDate = parseDateKey(dateKey);
  if (!entryDate) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (MAX_RETENTION_DAYS - 1));
  entryDate.setHours(0, 0, 0, 0);
  return entryDate >= cutoff;
}

function readResponses(userId: string): QuestionnaireDailyEntry[] {
  try {
    const raw = localStorage.getItem(`${LS_RESPONSES_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is QuestionnaireDailyEntry =>
          entry != null &&
          typeof entry === "object" &&
          typeof entry.date === "string" &&
          (entry.emoji == null || typeof entry.emoji === "string") &&
          (entry.badge == null || typeof entry.badge === "string") &&
          typeof entry.note === "string",
      )
      .filter((entry) => isWithinRetentionWindow(entry.date));
  } catch {
    return [];
  }
}

function writeResponses(userId: string, entries: QuestionnaireDailyEntry[]): void {
  try {
    localStorage.setItem(
      `${LS_RESPONSES_PREFIX}${userId}`,
      JSON.stringify(entries),
    );
  } catch {
    /* ignore */
  }
}

/** Afficher le questionnaire si pas encore vu / complété aujourd'hui pour cet utilisateur. */
export function shouldShowDailyQuestionnaire(userId: string | null | undefined): boolean {
  if (!userId || typeof window === "undefined") return false;
  try {
    const last = localStorage.getItem(`${LS_KEY_PREFIX}${userId}`);
    return last !== todayLocalDateKey();
  } catch {
    return true;
  }
}

export function markDailyQuestionnaireShown(userId: string | null | undefined): void {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${userId}`, todayLocalDateKey());
  } catch {
    /* ignore */
  }
}

/** Enregistre la réponse du jour et purge les entrées de plus d'une semaine. */
export function saveQuestionnaireResponse(
  userId: string | null | undefined,
  response: QuestionnaireResponse,
): void {
  if (!userId || typeof window === "undefined") return;

  const today = todayLocalDateKey();
  const nextEntry: QuestionnaireDailyEntry = {
    date: today,
    emoji: response.emoji,
    badge: response.badge,
    note: response.note,
  };

  const kept = readResponses(userId).filter((entry) => entry.date !== today);
  writeResponses(userId, [...kept, nextEntry]);
}

/** Réponses locales conservées au maximum 7 jours. */
export function getQuestionnaireResponses(
  userId: string | null | undefined,
): QuestionnaireDailyEntry[] {
  if (!userId || typeof window === "undefined") return [];
  const entries = readResponses(userId);
  writeResponses(userId, entries);
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
