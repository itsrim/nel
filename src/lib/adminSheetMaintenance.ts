import { isGoogleSheetsWriteConfigured } from "./googleSheetsDb";

const GOOGLE_SHEETS_API_URL =
  (import.meta.env.VITE_GOOGLE_SHEETS_API_URL as string | undefined) ?? "";

export type SpreadsheetStats = {
  bytes: number;
  sheetCount: number;
  messageRows: number;
  sheets: Array<{ name: string; rows: number }>;
};

export type DeleteMessagesResult = {
  deleted: number;
  remaining: number;
};

async function sheetAdminRequest<T extends Record<string, unknown>>(
  params: Record<string, string>,
): Promise<T> {
  if (!isGoogleSheetsWriteConfigured()) {
    throw new Error("VITE_GOOGLE_SHEETS_API_URL non configuré");
  }

  const search = new URLSearchParams(params);
  const response = await fetch(`${GOOGLE_SHEETS_API_URL}?${search.toString()}`, {
    method: "GET",
    mode: "cors",
    headers: { Accept: "application/json" },
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Sheets admin action failed: ${response.status}`);
  }

  let result: T & { ok?: boolean; error?: string };
  try {
    result = JSON.parse(bodyText) as typeof result;
  } catch {
    throw new Error(`Réponse non JSON (${bodyText.slice(0, 80)}…)`);
  }
  if (result.error) throw new Error(result.error);
  if (result.ok === false) throw new Error("Action Sheets refusée");
  return result;
}

export function formatSheetBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

/** Taille du classeur Google Sheets + nombre de lignes par onglet. */
export async function fetchSpreadsheetStats(): Promise<SpreadsheetStats> {
  const result = await sheetAdminRequest<{
    bytes?: number;
    sheetCount?: number;
    messageRows?: number;
    sheets?: Array<{ name: string; rows: number }>;
  }>({ action: "spreadsheetStats" });

  return {
    bytes: result.bytes ?? 0,
    sheetCount: result.sheetCount ?? 0,
    messageRows: result.messageRows ?? 0,
    sheets: result.sheets ?? [],
  };
}

/** Supprime toutes les lignes de l’onglet messages (hors en-tête). */
export async function deleteAllSheetMessages(): Promise<DeleteMessagesResult> {
  const result = await sheetAdminRequest<{
    deleted?: number;
    remaining?: number;
  }>({ action: "deleteMessages" });

  return {
    deleted: result.deleted ?? 0,
    remaining: result.remaining ?? 0,
  };
}

/** Supprime les messages dont sentAt est strictement avant cutoffMs. */
export async function deleteSheetMessagesBefore(
  cutoffMs: number,
): Promise<DeleteMessagesResult> {
  const result = await sheetAdminRequest<{
    deleted?: number;
    remaining?: number;
  }>({
    action: "deleteMessages",
    beforeSentAt: String(cutoffMs),
  });

  return {
    deleted: result.deleted ?? 0,
    remaining: result.remaining ?? 0,
  };
}

/** Date « YYYY-MM-DD » → timestamp début de journée locale. */
export function dateInputToCutoffMs(dateStr: string): number | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).getTime();
}
