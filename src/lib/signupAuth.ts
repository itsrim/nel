/** Génération locale des identifiants auth (front = source de vérité Sheets). */

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSignupUserId(): string {
  return `user_${Date.now()}_${randomHex(4)}`;
}

export function generateVerificationToken(): string {
  return randomHex(32);
}

export interface LocalSignupAuth {
  userId: string;
  emailVerified: boolean;
  verificationToken: string;
  verificationExpiresAt: number | null;
}

export function buildLocalSignupAuth(options?: {
  skipEmailVerification?: boolean;
  userId?: string;
}): LocalSignupAuth {
  const skipVerify = options?.skipEmailVerification === true;
  const verificationToken = generateVerificationToken();
  return {
    userId: options?.userId ?? generateSignupUserId(),
    emailVerified: skipVerify,
    verificationToken,
    verificationExpiresAt: Date.now() + VERIFICATION_TTL_MS,
  };
}

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function buildPasswordResetAuth(): {
  passwordResetToken: string;
  passwordResetExpiresAt: number;
} {
  return {
    passwordResetToken: generateVerificationToken(),
    passwordResetExpiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
  };
}
