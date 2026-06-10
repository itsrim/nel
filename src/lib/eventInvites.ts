import type {
  Conversation,
  Event,
  Friend,
  SuggestionProfile,
} from "../data/mockData";

export interface EventInviteProfile {
  profilId: string;
  name: string;
  imageUrl: string;
}

export function listAllAppProfiles(
  friends: Friend[],
  suggestions: SuggestionProfile[],
): EventInviteProfile[] {
  const map = new Map<string, EventInviteProfile>();
  for (const f of friends) {
    map.set(f.profilId, {
      profilId: f.profilId,
      name: f.name.trim() || f.pseudo?.trim() || f.profilId,
      imageUrl: f.imageUrl,
    });
  }
  for (const s of suggestions) {
    if (map.has(s.id)) continue;
    map.set(s.id, {
      profilId: s.id,
      name: s.pseudo.trim() || s.id,
      imageUrl: s.imageUrl,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
  );
}

export function listInvitableProfiles(
  event: Event,
  conversations: Conversation[],
  profiles: EventInviteProfile[],
): EventInviteProfile[] {
  const conv = conversations.find((c) => c.id === event.conversationId);
  const memberIds = new Set(
    (conv?.members ?? [])
      .map((m) => m.profilId)
      .filter((pid): pid is string => Boolean(pid)),
  );
  const invited = new Set(event.invitedProfilIds ?? []);
  return profiles.filter(
    (p) => !memberIds.has(p.profilId) && !invited.has(p.profilId),
  );
}

export function resolveInviteProfile(
  profilId: string,
  friends: Friend[],
  suggestions: SuggestionProfile[],
): EventInviteProfile | null {
  const id = profilId.trim();
  if (!id) return null;
  const friend = friends.find((f) => f.profilId === id);
  if (friend) {
    return {
      profilId: friend.profilId,
      name: friend.name.trim() || friend.pseudo?.trim() || id,
      imageUrl: friend.imageUrl,
    };
  }
  const suggestion = suggestions.find((s) => s.id === id);
  if (suggestion) {
    return {
      profilId: suggestion.id,
      name: suggestion.pseudo.trim() || id,
      imageUrl: suggestion.imageUrl,
    };
  }
  return null;
}

export function inviteProfileToFriend(profile: EventInviteProfile): Friend {
  return {
    profilId: profile.profilId,
    name: profile.name,
    pseudo: profile.name.split(/\s+/)[0] || profile.name,
    age: null,
    city: "",
    imageUrl: profile.imageUrl,
    eventsInCommon: 0,
    mainChatConversationId: "",
    mutualFriend: false,
  };
}

export function filterInviteProfiles(
  profiles: EventInviteProfile[],
  query: string,
): EventInviteProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return profiles;
  return profiles.filter((p) => p.name.toLowerCase().includes(q));
}
