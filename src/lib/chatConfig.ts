export const CHAT_API_BASE =
  (import.meta.env.VITE_CHAT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function isChatApiConfigured(): boolean {
  return CHAT_API_BASE.length > 0;
}
