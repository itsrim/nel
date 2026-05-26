/** Helpers sérialisation lignes CSV / Google Sheets. */

export function boolToSheet(v: boolean | undefined): string {
  return v ? "true" : "false";
}

export function boolFromSheet(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

export function numFromSheet(v: string | undefined, fallback = 0): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export function jsonToSheet(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function jsonFromSheet<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
