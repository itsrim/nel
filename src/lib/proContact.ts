/** Coordonnées affichées sur les comptes professionnels. */
export interface ProContactFields {
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
}

export function normalizeWebsiteUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function normalizeSocialUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`;
  return `https://${v}`;
}

export function phoneTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function proContactSearchText(c: ProContactFields): string {
  return [c.websiteUrl, c.socialUrl, c.phone].filter(Boolean).join(" ");
}

export function hasProContact(c: ProContactFields): boolean {
  return !!(c.websiteUrl?.trim() || c.socialUrl?.trim() || c.phone?.trim());
}
