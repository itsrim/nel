import { isFrontAdminLoginIdentifier, matchFrontAdminLogin } from "./frontAdminLogin";

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_FORMAT_RE.test(trimmed);
}

/** Connexion : email valide, ou combinaison admin rim / 1234!! */
export function canSubmitSignin(email: string, password: string): boolean {
  if (!password) return false;
  if (matchFrontAdminLogin(email, password)) return true;
  return isValidEmailFormat(email);
}

export function signinEmailValidationHint(email: string, password: string): "invalid" | null {
  const trimmed = email.trim();
  if (!trimmed || matchFrontAdminLogin(email, password)) return null;
  if (isFrontAdminLoginIdentifier(trimmed)) return null;
  if (!isValidEmailFormat(trimmed)) return "invalid";
  return null;
}
