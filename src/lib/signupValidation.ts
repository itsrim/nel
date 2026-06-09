/** Âge minimum à l'inscription : strictement supérieur à 16 ans. */
export const MIN_SIGNUP_AGE = 17;
export const MAX_SIGNUP_AGE = 120;

export function isValidSignupAge(ageRaw: string | undefined): boolean {
  const n = parseInt(ageRaw?.trim() ?? "", 10);
  return Number.isFinite(n) && n >= MIN_SIGNUP_AGE && n <= MAX_SIGNUP_AGE;
}
