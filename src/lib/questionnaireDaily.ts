const LS_KEY_PREFIX = "nel_questionnaire_last_shown_";

function todayLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
