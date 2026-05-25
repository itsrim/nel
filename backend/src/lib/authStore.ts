import { SignJWT, jwtVerify } from "jose";
import type { AuthUser } from "./types.js";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "nel-dev-secret-change-in-production",
);

interface StoredUser extends AuthUser {
  password: string;
}

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();

usersByEmail.set("demo@nel.com", {
  id: "user_demo_001",
  email: "demo@nel.com",
  displayName: "Utilisateur Demo",
  password: "password",
});
usersById.set("user_demo_001", usersByEmail.get("demo@nel.com")!);

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const id = payload.sub;
    const email = payload.email;
    const displayName = payload.displayName;
    if (typeof id !== "string" || typeof email !== "string" || typeof displayName !== "string") {
      return null;
    }
    return { id, email, displayName };
  } catch {
    return null;
  }
}

export function loginUser(email: string, password: string): AuthUser {
  const user = usersByEmail.get(email.trim().toLowerCase());
  if (!user || user.password !== password) {
    throw new Error("Email ou mot de passe incorrect");
  }
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export function signupUser(
  email: string,
  password: string,
  displayName: string,
): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password || !displayName.trim()) {
    throw new Error("Tous les champs sont requis");
  }
  if (password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères");
  }
  if (usersByEmail.has(normalizedEmail)) {
    throw new Error("Cet email est déjà utilisé");
  }

  const user: StoredUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    email: normalizedEmail,
    displayName: displayName.trim(),
    password,
  };

  usersByEmail.set(normalizedEmail, user);
  usersById.set(user.id, user);
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export function getUserById(userId: string): AuthUser | null {
  const user = usersById.get(userId);
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.displayName };
}
