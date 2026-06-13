import { ADMIN_USER_ID } from "./accountRoles";
import type { BuiltinAccount } from "./builtinAccounts";

/** Admin staff — connexion front uniquement, sans Google Sheets. */
export const FRONT_ADMIN_LOGIN = "rim";
export const FRONT_ADMIN_PASSWORD = "1234!!";

const FRONT_ADMIN_ACCOUNT: BuiltinAccount = {
  email: FRONT_ADMIN_LOGIN,
  password: FRONT_ADMIN_PASSWORD,
  displayName: "Admin",
  id: ADMIN_USER_ID,
  age: "28",
  bio: "Compte admin Hlg",
  isPro: true,
  emailVerified: true,
};

export function isFrontAdminLoginIdentifier(login: string): boolean {
  return login.trim().toLowerCase() === FRONT_ADMIN_LOGIN;
}

/** Seule combinaison rim / 1234!! — aucune vérif en base. */
export function matchFrontAdminLogin(login: string, password: string): boolean {
  return isFrontAdminLoginIdentifier(login) && password === FRONT_ADMIN_PASSWORD;
}

export function getFrontAdminAccount(): BuiltinAccount {
  return FRONT_ADMIN_ACCOUNT;
}
