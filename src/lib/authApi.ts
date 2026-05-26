import { CHAT_API_BASE } from "./chatConfig";
import type { User } from "../store/useAuthStore";

export const LS_AUTH_TOKEN = "nel_auth_token";

export interface AuthResponse {
  user: { id: string; email: string; displayName: string; emailVerified?: boolean };
  token: string;
}

export interface SignupPendingResponse {
  pendingVerification: true;
  email: string;
  message: string;
}

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

export async function loginWithApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as AuthResponse;
}

export async function signupWithApi(
  email: string,
  password: string,
  displayName: string,
): Promise<SignupPendingResponse> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  return (await res.json()) as SignupPendingResponse;
}

export async function verifyEmailWithApi(token: string): Promise<AuthResponse> {
  const res = await fetch(
    `${CHAT_API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
  );
  if (!res.ok) throw new Error(await parseAuthError(res));
  const data = (await res.json()) as { user: AuthResponse["user"]; token: string };
  return { user: data.user, token: data.token };
}

export async function resendVerificationWithApi(email: string): Promise<string> {
  const res = await fetch(`${CHAT_API_BASE}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  const data = (await res.json()) as { message?: string };
  return data.message ?? "Email renvoyé.";
}

export function toAppUser(
  apiUser: AuthResponse["user"],
  extras?: Partial<User>,
): User {
  const isDemo = apiUser.email === "demo@nel.com";
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName,
    emailVerified: apiUser.emailVerified ?? isDemo,
    avatarUrl: isDemo
      ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"
      : "/event-cover-themes/avatar.jpg",
    ...extras,
  };
}
