import {
  FRONT_ADMIN_LOGIN,
  matchFrontAdminLogin,
} from "./frontAdminLogin";

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ne pas afficher « email invalide » pendant une saisie type rim / rims (évite de révéler le compte admin). */
function shouldHideSigninEmailHint(email: string): boolean {
  const typed = email.trim().toLowerCase();
  if (!typed) return true;
  const admin = FRONT_ADMIN_LOGIN;
  return admin.startsWith(typed) || typed.startsWith(admin);
}

export function isValidEmailFormat(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_FORMAT_RE.test(trimmed);
}

/** Prêt à soumettre (UI) — même règle pour tous les comptes, sans révéler l’admin. */
export function canSubmitSignin(email: string, password: string): boolean {
  return !!email.trim() && password.length >= 6;
}

export function signinEmailValidationHint(email: string, password: string): "invalid" | null {
  const trimmed = email.trim();
  if (!trimmed || matchFrontAdminLogin(email, password)) return null;
  if (shouldHideSigninEmailHint(email)) return null;
  if (!isValidEmailFormat(trimmed)) return "invalid";
  return null;
}
