const STORAGE_PREFIX = "nel_login_attempts:";
const MAX_FAILURES = 3;
const LOCKOUT_MS = 5 * 60 * 1000;

export type LoginAttemptInfo = {
  failures: number;
  lockedUntil: number | null;
  isLocked: boolean;
  remainingMs: number;
};

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readRaw(email: string): { failures: number; lockedUntil: number | null } {
  if (!email.trim()) return { failures: 0, lockedUntil: null };
  try {
    const raw = sessionStorage.getItem(storageKey(email));
    if (!raw) return { failures: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as {
      failures?: number;
      lockedUntil?: number | null;
    };
    return {
      failures:
        typeof parsed.failures === "number" && parsed.failures >= 0
          ? parsed.failures
          : 0,
      lockedUntil:
        typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : null,
    };
  } catch {
    return { failures: 0, lockedUntil: null };
  }
}

function writeRaw(
  email: string,
  state: { failures: number; lockedUntil: number | null },
): void {
  if (!email.trim()) return;
  sessionStorage.setItem(storageKey(email), JSON.stringify(state));
}

export function getLoginAttemptInfo(email: string): LoginAttemptInfo {
  const raw = readRaw(email);
  const now = Date.now();

  if (raw.lockedUntil != null && now >= raw.lockedUntil) {
    writeRaw(email, { failures: 0, lockedUntil: null });
    return {
      failures: 0,
      lockedUntil: null,
      isLocked: false,
      remainingMs: 0,
    };
  }

  const isLocked = raw.lockedUntil != null && now < raw.lockedUntil;
  return {
    failures: raw.failures,
    lockedUntil: isLocked ? raw.lockedUntil : null,
    isLocked,
    remainingMs: isLocked ? raw.lockedUntil! - now : 0,
  };
}

export function recordLoginFailure(email: string): LoginAttemptInfo {
  const current = getLoginAttemptInfo(email);
  if (current.isLocked) return current;

  const failures = current.failures + 1;
  if (failures >= MAX_FAILURES) {
    writeRaw(email, { failures, lockedUntil: Date.now() + LOCKOUT_MS });
  } else {
    writeRaw(email, { failures, lockedUntil: null });
  }
  return getLoginAttemptInfo(email);
}

export function resetLoginAttempts(email: string): void {
  if (!email.trim()) return;
  sessionStorage.removeItem(storageKey(email));
}

export function formatLoginLockoutDuration(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
