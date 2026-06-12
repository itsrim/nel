export interface MathCaptcha {
  question: string;
  answer: number;
}

export function createMathCaptcha(): MathCaptcha {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const add = Math.random() >= 0.5;
  if (add) {
    return { question: `${a} + ${b} = ?`, answer: a + b };
  }
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return { question: `${hi} − ${lo} = ?`, answer: hi - lo };
}

export function isMathCaptchaAnswerValid(
  captcha: MathCaptcha,
  raw: string,
): boolean {
  const n = Number(raw.trim());
  return Number.isFinite(n) && n === captcha.answer;
}
