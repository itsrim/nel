import type { Conversation, Event, Friend } from "../data/mockData";
import { resolveAvatarUrl } from "./avatarUrl";
import { eventHostedByViewer, resolveEventHostAvatar } from "./eventHost";

const DEFAULT_VIEWER_AVATAR = resolveAvatarUrl();

/** Jusqu’à 3 photos pour la pile sur la carte sortie. */
export function buildEventParticipantAvatars(
  hostAvatar: string,
  members: Array<{ isSelf?: boolean; profilId?: string; avatarUrl?: string }>,
  friends: Friend[],
  viewerProfileAvatarUrl = DEFAULT_VIEWER_AVATAR,
  max = 3,
): string[] {
  const urls: string[] = [];
  const push = (url?: string) => {
    const u = url?.trim();
    if (!u || urls.includes(u) || urls.length >= max) return;
    urls.push(u);
  };

  push(hostAvatar);

  for (const m of members) {
    if (urls.length >= max) break;
    if (m.isSelf) {
      push(viewerProfileAvatarUrl);
      continue;
    }
    push(m.avatarUrl);
    if (m.profilId) {
      push(friends.find((f) => f.profilId === m.profilId)?.imageUrl);
    }
  }

  return urls.slice(0, max);
}

export function resolveEventParticipantAvatars(
  event: Event,
  conversations: Conversation[],
  friends: Friend[],
  viewerProfileAvatarUrl: string,
  max = 3,
): string[] {
  const hostAvatar = resolveEventHostAvatar(event, viewerProfileAvatarUrl);

  if (event.participantAvatars?.length) {
    const urls = event.participantAvatars
      .map((u) => resolveAvatarUrl(u))
      .filter(Boolean)
      .slice(0, max);
    if (eventHostedByViewer(event)) {
      if (urls.length === 0) return [hostAvatar];
      urls[0] = hostAvatar;
      const deduped: string[] = [];
      for (const u of urls) {
        if (!deduped.includes(u)) deduped.push(u);
        if (deduped.length >= max) break;
      }
      return deduped;
    }
    return urls;
  }

  const conv = conversations.find((c) => c.id === event.conversationId);
  if (conv?.members?.length) {
    return buildEventParticipantAvatars(
      hostAvatar,
      conv.members,
      friends,
      viewerProfileAvatarUrl,
      max,
    );
  }

  const urls: string[] = [];
  const push = (url?: string) => {
    const u = url?.trim();
    if (!u || urls.includes(u) || urls.length >= max) return;
    urls.push(resolveAvatarUrl(u));
  };

  push(hostAvatar);
  for (const w of event.waitlistEntries ?? []) {
    if (urls.length >= max) break;
    push(w.imageUrl);
  }

  return urls.slice(0, max);
}
