/**
 * Hash mot de passe pour Google Sheets (colonne passwordHash).
 * Préfixe sha256: — le backend pourra vérifier plus tard si besoin.
 */

import CryptoJS from "crypto-js";

export function hashPasswordForSheet(password: string): string {
  const hex = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
  return `sha256:${hex}`;
}

export function verifyPasswordForSheet(password: string, stored: string): boolean {
  const trimmed = stored.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("sha256:")) {
    return trimmed === hashPasswordForSheet(password);
  }
  return trimmed === password;
}
