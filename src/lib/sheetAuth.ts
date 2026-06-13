/**
 * Authentification front-only — lit viewer_settings (export CSV Google Sheets).
 */

import {
  isGoogleSheetsReadConfigured,
  sheetGet,
} from "./googleSheetsDb";
import { isReservedBuiltinEmail, matchBuiltinAccount } from "./builtinAccounts";
import { hashPasswordForSheet, verifyPasswordForSheet } from "./passwordHash";
import { boolFromSheet, isDeletedFromSheet, numFromSheet } from "./sheetRowCodec";

export interface SheetAuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isPro: boolean;
  age: string;
  bio: string;
  language: string;
}

const CONFIRM_EMAIL_MSG =
  "Veuillez confirmer votre email avant de vous connecter. Consultez votre boîte mail ou renvoyez l'email de vérification.";

export async function loadViewerSettingsRows(): Promise<Record<string, string>[]> {
  return sheetGet<Record<string, string>>("viewer_settings");
}

export async function findViewerRowByEmail(
  email: string,
): Promise<Record<string, string> | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const rows = await loadViewerSettingsRows();
  return (
    rows.find(
      (r) =>
        !isDeletedFromSheet(r.deleted) &&
        r.email?.trim().toLowerCase() === normalized,
    ) ?? null
  );
}

export async function findViewerRowById(
  userId: string,
): Promise<Record<string, string> | null> {
  const id = userId.trim();
  if (!id) return null;
  const rows = await loadViewerSettingsRows();
  return (
    rows.find(
      (r) =>
        !isDeletedFromSheet(r.deleted) &&
        (r.id?.trim() === id || r.userId?.trim() === id),
    ) ?? null
  );
}

export async function findViewerRowByVerificationToken(
  token: string,
): Promise<Record<string, string> | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const rows = await loadViewerSettingsRows();
  return (
    rows.find((r) => !isDeletedFromSheet(r.deleted) && r.verificationToken?.trim() === trimmed) ??
    null
  );
}

export async function findViewerRowByPasswordResetToken(
  token: string,
): Promise<Record<string, string> | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const rows = await loadViewerSettingsRows();
  return (
    rows.find((r) => !isDeletedFromSheet(r.deleted) && r.passwordResetToken?.trim() === trimmed) ??
    null
  );
}

function rowToAuthUser(row: Record<string, string>): SheetAuthUser {
  const id = row.id?.trim() || row.userId?.trim() || "";
  const email = row.email?.trim().toLowerCase() || "";
  return {
    id,
    email,
    displayName: row.displayName?.trim() || email,
    emailVerified: boolFromSheet(row.emailVerified),
    isPro: boolFromSheet(row.isPro),
    age: row.age?.trim() || "",
    bio: row.bio?.trim() || "",
    language: row.language?.trim() || "",
  };
}

export async function shouldSkipEmailVerificationFromSheets(): Promise<boolean> {
  try {
    const rows = await sheetGet<Record<string, string>>("app_config");
    const global = rows.find((r) => r.id === "global");
    return boolFromSheet(global?.skipEmailVerification);
  } catch {
    return false;
  }
}

/** Connexion — vérifie passwordHash + emailVerified dans viewer_settings. */
export async function loginFromViewerSettings(
  email: string,
  password: string,
): Promise<SheetAuthUser> {
  if (!isGoogleSheetsReadConfigured()) {
    throw new Error("Google Sheets non configuré pour la connexion.");
  }

  if (isReservedBuiltinEmail(email)) {
    throw new Error("Email ou mot de passe incorrect");
  }

  const row = await findViewerRowByEmail(email);
  const builtin = matchBuiltinAccount(email, password);
  if (builtin && (!row || !row.passwordHash?.trim())) {
    return {
      id: builtin.id,
      email: builtin.email,
      displayName: builtin.displayName,
      emailVerified: builtin.emailVerified !== false,
      isPro: !!builtin.isPro,
      age: builtin.age ?? "",
      bio: builtin.bio ?? "",
      language: "fr",
    };
  }

  if (!row || !verifyPasswordForSheet(password, row.passwordHash ?? "")) {
    throw new Error("Email ou mot de passe incorrect");
  }

  const user = rowToAuthUser(row);
  if (!user.emailVerified) {
    const skip = await shouldSkipEmailVerificationFromSheets();
    if (!skip) {
      throw new Error(CONFIRM_EMAIL_MSG);
    }
    user.emailVerified = true;
  }

  return user;
}

/** Vérifie le lien email — lit le token dans viewer_settings. */
export async function verifyEmailFromViewerSettings(token: string): Promise<SheetAuthUser> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Lien de vérification invalide");
  }

  const row = await findViewerRowByVerificationToken(trimmed);
  if (!row) {
    throw new Error("Lien de vérification invalide ou déjà utilisé");
  }

  if (boolFromSheet(row.emailVerified)) {
    return rowToAuthUser(row);
  }

  const expires = numFromSheet(row.verificationExpiresAt, 0);
  if (expires > 0 && Date.now() > expires) {
    throw new Error("Ce lien a expiré. Demandez un nouvel email de vérification.");
  }

  return { ...rowToAuthUser(row), emailVerified: true };
}

/** Reset mot de passe — valide le token dans viewer_settings. */
export async function validatePasswordResetToken(token: string): Promise<SheetAuthUser> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Lien de réinitialisation invalide");
  }

  const row = await findViewerRowByPasswordResetToken(trimmed);
  if (!row) {
    throw new Error("Lien de réinitialisation invalide ou déjà utilisé");
  }

  const expires = numFromSheet(row.passwordResetExpiresAt, 0);
  if (expires > 0 && Date.now() > expires) {
    throw new Error("Ce lien a expiré. Demandez un nouvel email de réinitialisation.");
  }

  return rowToAuthUser(row);
}

export { hashPasswordForSheet, verifyPasswordForSheet };
