import Papa from "papaparse";

/** Onglet Google Sheet = table CSV logique. */
export type SheetTableName =
  | "messages"
  | "events"
  | "conversations"
  | "profiles"
  | "suggestions"
  | "viewer_settings"
  | "profile_visits"
  | "notifications"
  | "admin_reports"
  | "professionals"
  | "app_config";

export interface SheetTableConfig {
  /** Nom de l’onglet dans le classeur. */
  sheetName: string;
  /** GID de l’onglet (visible dans l’URL #gid=…). */
  gid: string;
  /** Colonne identifiant pour PUT. */
  idColumn: string;
  /** CSV local de secours (public/). */
  fallbackCsvPath?: string;
}

const GOOGLE_SHEETS_URL_ENCODED =
  (import.meta.env.VITE_GOOGLE_SHEETS_URL_ENCODED as string | undefined) ?? "";
const GOOGLE_SHEETS_API_URL =
  (import.meta.env.VITE_GOOGLE_SHEETS_API_URL as string | undefined) ?? "";

function gidEnv(key: string, fallback: string): string {
  return (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ?? fallback;
}

/** Registre des tables — ajouter un onglet = ajouter une entrée ici. */
export const SHEET_TABLES: Record<SheetTableName, SheetTableConfig> = {
  messages: {
    sheetName: "messages",
    gid: gidEnv("VITE_SHEET_GID_MESSAGES", "0"),
    idColumn: "id",
    fallbackCsvPath:
      (import.meta.env.VITE_DEFAULT_CSV_PATH as string | undefined) ?? "/nel/messages.csv",
  },
  events: {
    sheetName: "events",
    gid: gidEnv("VITE_SHEET_GID_EVENTS", "0"),
    idColumn: "id",
  },
  conversations: {
    sheetName: "conversations",
    gid: gidEnv("VITE_SHEET_GID_CONVERSATIONS", "0"),
    idColumn: "id",
  },
  profiles: {
    sheetName: "profiles",
    gid: gidEnv("VITE_SHEET_GID_PROFILES", "0"),
    idColumn: "id",
  },
  suggestions: {
    sheetName: "suggestions",
    gid: gidEnv("VITE_SHEET_GID_SUGGESTIONS", "0"),
    idColumn: "id",
  },
  viewer_settings: {
    sheetName: "viewer_settings",
    gid: gidEnv("VITE_SHEET_GID_VIEWER_SETTINGS", "0"),
    idColumn: "id",
  },
  profile_visits: {
    sheetName: "profile_visits",
    gid: gidEnv("VITE_SHEET_GID_PROFILE_VISITS", "0"),
    idColumn: "id",
  },
  notifications: {
    sheetName: "notifications",
    gid: gidEnv("VITE_SHEET_GID_NOTIFICATIONS", "0"),
    idColumn: "id",
  },
  admin_reports: {
    sheetName: "admin_reports",
    gid: gidEnv("VITE_SHEET_GID_ADMIN_REPORTS", "0"),
    idColumn: "id",
  },
  professionals: {
    sheetName: "professionals",
    gid: gidEnv("VITE_SHEET_GID_PROFESSIONALS", "0"),
    idColumn: "id",
  },
  app_config: {
    sheetName: "app_config",
    gid: gidEnv("VITE_SHEET_GID_APP_CONFIG", "0"),
    idColumn: "id",
    fallbackCsvPath: "/nel/app_config.csv",
  },
};

/** Déchiffrement simple (décalage −1), comme dans ton exemple. */
export function simpleDecrypt(encoded: string): string {
  return encoded
    .split("")
    .map((char) => String.fromCharCode(char.charCodeAt(0) - 1))
    .join("");
}

export function isGoogleSheetsReadConfigured(): boolean {
  return GOOGLE_SHEETS_URL_ENCODED.trim().length > 0;
}

export function isGoogleSheetsWriteConfigured(): boolean {
  return GOOGLE_SHEETS_API_URL.trim().length > 0;
}

function getSpreadsheetBaseUrl(): string {
  const decoded = simpleDecrypt(GOOGLE_SHEETS_URL_ENCODED);
  return decoded.replace(/\/edit(\?.*)?$/i, "");
}

function getCsvExportUrl(table: SheetTableName): string {
  const { gid } = SHEET_TABLES[table];
  return `${getSpreadsheetBaseUrl()}/export?format=csv&gid=${gid}`;
}

async function fetchCsvText(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new Error(`CSV fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseCsvToRows<T extends Record<string, string>>(csvData: string): T[] {
  const parsed = Papa.parse<T>(csvData, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    console.warn("PapaParse warnings:", parsed.errors);
  }
  return parsed.data;
}

async function readLocalFallbackCsv<T extends Record<string, string>>(
  table: SheetTableName,
): Promise<T[]> {
  const path = SHEET_TABLES[table].fallbackCsvPath;
  if (!path) return [];
  const csvData = await fetchCsvText(path);
  return parseCsvToRows<T>(csvData);
}

/**
 * GET — lit un onglet comme table CSV (Google Sheets → CSV export).
 * Fallback : CSV local dans public/ (messages uniquement).
 */
export async function sheetGet<T extends Record<string, string>>(
  table: SheetTableName,
): Promise<T[]> {
  if (isGoogleSheetsReadConfigured()) {
    try {
      const csvData = await fetchCsvText(getCsvExportUrl(table));
      return parseCsvToRows<T>(csvData);
    } catch (error) {
      console.error(`Google Sheets GET [${table}] failed:`, error);
      if (SHEET_TABLES[table].fallbackCsvPath) {
        console.log(`Fallback CSV local pour [${table}]…`);
      } else {
        return [];
      }
    }
  }

  try {
    return await readLocalFallbackCsv<T>(table);
  } catch (error) {
    console.error(`Local CSV GET [${table}] failed:`, error);
    return [];
  }
}

async function sheetMutate(
  action: "post" | "put" | "batchPost",
  table: SheetTableName,
  payload: Record<string, unknown>,
): Promise<{ ok?: boolean; skipped?: boolean; error?: string }> {
  if (!isGoogleSheetsWriteConfigured()) {
    throw new Error("VITE_GOOGLE_SHEETS_API_URL non configuré (Apps Script requis pour POST/PUT)");
  }

  const response = await fetch(GOOGLE_SHEETS_API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      sheet: SHEET_TABLES[table].sheetName,
      idColumn: SHEET_TABLES[table].idColumn,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sheets ${action} failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    ok?: boolean;
    skipped?: boolean;
    error?: string;
  };
  if (result.error) throw new Error(result.error);
  if (result.ok === false) throw new Error(`Sheets ${action} rejected`);
  return result;
}

/**
 * POST — ajoute une ligne (ignore si id déjà présent côté Apps Script).
 */
export async function sheetPost<T extends Record<string, unknown>>(
  table: SheetTableName,
  row: T,
): Promise<void> {
  await sheetMutate("post", table, { row });
}

/**
 * POST batch — ajoute plusieurs lignes.
 */
export async function sheetBatchPost<T extends Record<string, unknown>>(
  table: SheetTableName,
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;
  await sheetMutate("batchPost", table, { rows });
}

/**
 * PUT — met à jour une ligne par id (colonnes présentes dans le patch).
 */
export async function sheetPut<T extends Record<string, unknown>>(
  table: SheetTableName,
  id: string,
  row: Partial<T>,
): Promise<void> {
  await sheetMutate("put", table, { id, row });
}

/** Sérialise des lignes en CSV (header + Papa unparse). */
export function rowsToCsv<T extends Record<string, unknown>>(rows: T[]): string {
  return Papa.unparse(rows);
}

/** Parse un CSV string en lignes typées. */
export function csvToRows<T extends Record<string, string>>(csv: string): T[] {
  return parseCsvToRows<T>(csv);
}
