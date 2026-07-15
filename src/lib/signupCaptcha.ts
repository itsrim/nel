export interface MathCaptcha {
  question: string;
  answer: number;
}

function buildMathCaptcha(): MathCaptcha {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const add = Math.random() >= 0.5;
  if (add) {
    return { question: `${a} + ${b} = ?`, answer: a + b };
  }
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === lo) {
    return { question: `${hi + 1} − ${lo} = ?`, answer: 1 };
  }
  return { question: `${hi} − ${lo} = ?`, answer: hi - lo };
}

export function createMathCaptcha(exclude?: MathCaptcha): MathCaptcha {
  for (let i = 0; i < 24; i++) {
    const next = buildMathCaptcha();
    if (!exclude || next.question !== exclude.question) return next;
  }
  return buildMathCaptcha();
}

export function isMathCaptchaAnswerValid(
  captcha: MathCaptcha,
  raw: string,
): boolean {
  const n = Number(raw.trim());
  return Number.isFinite(n) && n === captcha.answer;
}
