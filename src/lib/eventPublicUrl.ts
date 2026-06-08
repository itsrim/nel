const DEFAULT_EVENT_PUBLIC_BASE = "https://happyletsgo.fr";

export function eventPublicBaseUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_EVENT_PUBLIC_BASE_URL as string | undefined
  )?.trim();
  return (fromEnv || DEFAULT_EVENT_PUBLIC_BASE).replace(/\/$/, "");
}

/** URL publique partageable d'une sortie (HappyLetsGo). */
export function buildEventPublicUrl(eventId: string): string {
  const id = eventId.trim();
  return `${eventPublicBaseUrl()}/event/${encodeURIComponent(id)}`;
}

export function resolveEventPublicUrl(event: {
  id: string;
  publicUrl?: string;
}): string {
  const custom = event.publicUrl?.trim();
  if (custom) return custom;
  return buildEventPublicUrl(event.id);
}
