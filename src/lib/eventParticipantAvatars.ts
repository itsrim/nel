import type { Conversation, Event, Friend } from "../data/mockData";
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from "./avatarUrl";
import { eventHostedByViewer, resolveEventHostAvatar, type ViewerContext } from "./eventHost";

const DEFAULT_VIEWER_AVATAR = resolveAvatarUrl();

function avatarKey(url: string): string {
  return resolveAvatarUrl(url).split("?")[0].toLowerCase();
}

function isGenericPlaceholderAvatar(url: string): boolean {
  const resolved = resolveAvatarUrl(url);
  const key = avatarKey(resolved);
  return (
    key === avatarKey(DEFAULT_AVATAR_URL) ||
    key.includes("event-cover-themes/avatar") ||
    key.includes("nel-organizer")
  );
}

function sameAvatar(a: string, b: string): boolean {
  return avatarKey(a) === avatarKey(b);
}

/** Jusqu’à 3 photos pour la pile sur la carte sortie — 1ʳᵉ = organisateur. */
export function buildEventParticipantAvatars(
  hostAvatar: string,
  members: Array<{ isSelf?: boolean; profilId?: string; avatarUrl?: string }>,
  friends: Friend[],
  viewerProfileAvatarUrl = DEFAULT_VIEWER_AVATAR,
  max = 3,
  viewerIsHost = false,
  participantCount = 1,
): string[] {
  const host = resolveAvatarUrl(hostAvatar);
  const limit = Math.min(max, Math.max(1, participantCount));
  if (participantCount <= 1) return [host];

  const viewerAv = resolveAvatarUrl(viewerProfileAvatarUrl);
  const urls: string[] = [];
  const push = (url?: string) => {
    const u = url?.trim() ? resolveAvatarUrl(url) : "";
    if (!u || urls.length >= limit) return;
    if (isGenericPlaceholderAvatar(u) && urls.length > 0) return;
    if (urls.some((existing) => sameAvatar(existing, u))) return;
    if (!viewerIsHost && sameAvatar(u, viewerAv)) return;
    urls.push(u);
  };

  push(host);

  for (const m of members) {
    if (urls.length >= limit) break;
    if (m.isSelf) {
      if (viewerIsHost) push(viewerProfileAvatarUrl);
      continue;
    }
    push(m.avatarUrl);
    if (m.profilId) {
      push(friends.find((f) => f.profilId === m.profilId)?.imageUrl);
    }
  }

  if (urls.length === 0) return [host];
  urls[0] = host;
  return urls.slice(0, limit);
}

export function resolveEventParticipantAvatars(
  event: Event,
  conversations: Conversation[],
  friends: Friend[],
  viewerProfileAvatarUrl: string,
  max = 3,
  viewer?: ViewerContext | null,
): string[] {
  const viewerIsHost = eventHostedByViewer(event, viewer);
  const hostAvatar = resolveEventHostAvatar(event, viewerProfileAvatarUrl, viewer);
  const participantCount = Math.max(0, event.participantCount ?? 0);
  const host = resolveAvatarUrl(hostAvatar);
  const limit = Math.min(max, Math.max(1, participantCount || 1));

  if (participantCount <= 1) {
    return [host];
  }

  const viewerAv = resolveAvatarUrl(viewerProfileAvatarUrl);
  const urls: string[] = [];
  const push = (url?: string) => {
    const u = url?.trim() ? resolveAvatarUrl(url) : "";
    if (!u || urls.length >= limit) return;
    if (isGenericPlaceholderAvatar(u) && urls.length > 0) return;
    if (urls.some((existing) => sameAvatar(existing, u))) return;
    if (!viewerIsHost && sameAvatar(u, viewerAv)) return;
    urls.push(u);
  };

  push(host);

  if (event.participantAvatars?.length) {
    for (const raw of event.participantAvatars) {
      if (sameAvatar(raw, hostAvatar)) continue;
      push(raw);
    }
  } else {
    const conv = conversations.find((c) => c.id === event.conversationId);
    if (conv?.members?.length) {
      for (const m of conv.members) {
        if (urls.length >= limit) break;
        if (m.isSelf) {
          if (viewerIsHost && !sameAvatar(viewerProfileAvatarUrl, hostAvatar)) {
            push(viewerProfileAvatarUrl);
          }
          continue;
        }
        push(m.avatarUrl);
        if (m.profilId) {
          push(friends.find((f) => f.profilId === m.profilId)?.imageUrl);
        }
      }
    } else {
      for (const w of event.waitlistEntries ?? []) {
        if (urls.length >= limit) break;
        push(w.imageUrl);
      }
    }
  }

  if (urls.length === 0) return [host];
  urls[0] = host;
  return urls.slice(0, limit);
}
