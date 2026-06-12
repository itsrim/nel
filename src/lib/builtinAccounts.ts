import { ADMIN_USER_ID } from "./accountRoles";
import { hashPasswordForSheet } from "./passwordHash";

/** Comptes intégrés — toujours acceptés, même avec Google Sheets configuré. */
export type BuiltinAccount = {
  email: string;
  password: string;
  displayName: string;
  id: string;
  age?: string;
  bio?: string;
  isPro?: boolean;
  emailVerified?: boolean;
};

const BUILTIN_ACCOUNTS: Record<string, BuiltinAccount> = {
  "admin@rim.com": {
    email: "admin@rim.com",
    password: "password",
    displayName: "Utilisateur Demo",
    id: "user_demo_001",
    age: "28",
    bio: "Bienvenue sur hlg!",
    isPro: false,
    emailVerified: true,
  },
  rim: {
    email: "rim",
    password: "1234",
    displayName: "Admin",
    id: ADMIN_USER_ID,
    age: "28",
    bio: "Compte admin Hlg",
    isPro: true,
    emailVerified: true,
  },
};

export function matchBuiltinAccount(
  email: string,
  password: string,
): BuiltinAccount | null {
  const key = email.trim().toLowerCase();
  const account = BUILTIN_ACCOUNTS[key];
  if (!account || account.password !== password) return null;
  return account;
}

export function isReservedBuiltinEmail(email: string): boolean {
  return email.trim().toLowerCase() in BUILTIN_ACCOUNTS;
}

export function builtinAccountPasswordHash(account: BuiltinAccount): string {
  return hashPasswordForSheet(account.password);
}
