import { CHAT_API_BASE, isChatApiConfigured } from "./chatConfig";
import type { User } from "../store/useAuthStore";
import { isAdminAccount } from "./accountRoles";
import { resolveAvatarUrl } from "./avatarUrl";

export const LS_AUTH_TOKEN = "nel_auth_token";

export interface AuthResponse {
  user: { id: string; email: string; displayName: string; emailVerified?: boolean };
  token: string;
}

export interface SignupSheetAuth {
  emailVerified: boolean;
  verificationToken: string;
  verificationExpiresAt: number | null;
}

export interface SignupPendingResponse {
  pendingVerification: true;
  email: string;
  userId: string;
  displayName: string;
  message: string;
  sheetAuth: SignupSheetAuth;
  emailDeliveryFailed?: boolean;
}

export type SignupApiResponse =
  | SignupPendingResponse
  | (AuthResponse & {
      pendingVerification?: false;
      message?: string;
      sheetAuth?: SignupSheetAuth;
    });

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_AUTH_TOKEN);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(LS_AUTH_TOKEN, token);
  else localStorage.removeItem(LS_AUTH_TOKEN);
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseAuthError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Erreur ${res.status}`;
  } catch {
    return `Erreur ${res.status}`;
  }
}

export async function fetchSessionToken(user: {
  id: string;
  email: string;
  displayName: string;
  emailVerified?: boolean;
}): Promise<{ user: AuthResponse["user"]; token: string }> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified !== false,
    }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as { user: AuthResponse["user"]; token: string };
}

/** JWT chat — ne bloque pas la connexion si le backend n'a pas encore /api/auth/session. */
export async function trySetSessionToken(user: {
  id: string;
  email: string;
  displayName: string;
  emailVerified?: boolean;
}): Promise<boolean> {
  if (!isChatApiConfigured()) return false;
  try {
    const { token } = await fetchSessionToken(user);
    setAuthToken(token);
    return true;
  } catch (err) {
    console.warn("[auth] JWT chat indisponible (backend à redéployer ?):", err);
    return false;
  }
}

export async function signupWithApi(
  email: string,
  password: string,
  displayName: string,
  options?: {
    userId?: string;
    verificationToken?: string;
    verificationExpiresAt?: number | null;
    skipEmailVerification?: boolean;
  },
): Promise<SignupApiResponse> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      displayName,
      userId: options?.userId,
      verificationToken: options?.verificationToken,
      verificationExpiresAt: options?.verificationExpiresAt,
      skipEmailVerification: options?.skipEmailVerification === true,
    }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as SignupApiResponse;
}

export interface ResendVerificationResponse {
  ok?: boolean;
  message?: string;
  emailDeliveryFailed?: boolean;
  userId?: string;
  verificationToken?: string;
  verificationExpiresAt?: number | null;
}

export async function resendVerificationWithApi(
  email: string,
  displayName?: string,
  options?: { verificationToken?: string; verificationExpiresAt?: number | null },
): Promise<ResendVerificationResponse> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      displayName,
      verificationToken: options?.verificationToken,
      verificationExpiresAt: options?.verificationExpiresAt,
    }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as ResendVerificationResponse;
}

export interface ForgotPasswordResponse {
  ok?: boolean;
  message?: string;
  emailDeliveryFailed?: boolean;
  userId?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: number;
}

export async function forgotPasswordWithApi(
  email: string,
  displayName?: string,
  options?: {
    passwordResetToken?: string;
    passwordResetExpiresAt?: number | null;
  },
): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      displayName,
      passwordResetToken: options?.passwordResetToken,
      passwordResetExpiresAt: options?.passwordResetExpiresAt,
    }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as ForgotPasswordResponse;
}

export function toAppUser(
  apiUser: AuthResponse["user"] & { avatarUrl?: string },
  extras?: Partial<User>,
): User {
  const emailNorm = apiUser.email.trim().toLowerCase();
  const isDemo = emailNorm === "admin@rim.com";
  const isRimAdmin = emailNorm === "rim" || apiUser.id === "user_admin_001";
  const avatarFromSource =
    extras?.avatarUrl?.trim() ||
    apiUser.avatarUrl?.trim() ||
    "";
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName,
    emailVerified: apiUser.emailVerified ?? (isDemo || isRimAdmin),
    isAdmin: isAdminAccount({ email: apiUser.email, id: apiUser.id }),
    avatarUrl: isDemo
      ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"
      : avatarFromSource
        ? resolveAvatarUrl(avatarFromSource)
        : resolveAvatarUrl(),
    isPro: extras?.isPro ?? isRimAdmin,
    ...extras,
  };
}
