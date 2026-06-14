import { isValidEmailFormat } from "./loginFormValidation";

/** Âge minimum à l'inscription : strictement supérieur à 16 ans. */
export const MIN_SIGNUP_AGE = 17;
export const MAX_SIGNUP_AGE = 120;

export function isValidSignupAge(ageRaw: string | undefined): boolean {
  const n = parseInt(ageRaw?.trim() ?? "", 10);
  return Number.isFinite(n) && n >= MIN_SIGNUP_AGE && n <= MAX_SIGNUP_AGE;
}

export type SignupBlockerId =
  | "displayName"
  | "email"
  | "age"
  | "password"
  | "captcha";

export function getSignupFormBlockers(input: {
  email: string;
  password: string;
  displayName: string;
  age: string;
  captchaValid: boolean;
}): SignupBlockerId[] {
  const blockers: SignupBlockerId[] = [];
  if (!input.displayName.trim()) blockers.push("displayName");
  if (!isValidEmailFormat(input.email)) blockers.push("email");
  if (!isValidSignupAge(input.age)) blockers.push("age");
  if (input.password.length < 6) blockers.push("password");
  if (!input.captchaValid) blockers.push("captcha");
  return blockers;
}

export function isSignupFormValid(input: {
  email: string;
  password: string;
  displayName: string;
  age: string;
  captchaValid: boolean;
}): boolean {
  return getSignupFormBlockers(input).length === 0;
}
