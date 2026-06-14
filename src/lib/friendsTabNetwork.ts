import type { Friend, ProfileVisit, SuggestionProfile } from "../data/mockData";
import { DEFAULT_AVATAR_URL } from "./avatarUrl";

export type FriendNetworkStatus = "mutual" | "incoming" | "sent" | "rejected";

export type FriendNetworkEntry = {
  id: string;
  name: string;
  age: number | null;
  imageUrl: string;
  lastVisitAt: number;
  friendRequest: boolean;
  status: FriendNetworkStatus;
};

const STATUS_SORT: Record<FriendNetworkStatus, number> = {
  incoming: 0,
  sent: 1,
  rejected: 2,
  mutual: 3,
};

function resolveProfile(
  id: string,
  friends: Friend[],
  profileVisits: ProfileVisit[],
  suggestions: SuggestionProfile[],
) {
  const friend = friends.find((f) => f.profilId === id);
  const visit = profileVisits.find((v) => v.id === id);
  const sug = suggestions.find((s) => s.id === id);
  return {
    name: friend?.name ?? visit?.name ?? sug?.pseudo ?? id,
    age: friend?.age ?? visit?.age ?? sug?.age ?? null,
    imageUrl:
      friend?.imageUrl ??
      visit?.avatarUrl ??
      sug?.imageUrl ??
      DEFAULT_AVATAR_URL,
    lastVisitAt: visit?.lastVisitAt ?? 0,
    friendRequest: visit?.friendRequest ?? false,
  };
}

function isMutualFriend(id: string, friends: Friend[]): boolean {
  return friends.some((f) => f.profilId === id && f.mutualFriend === true);
}

/** Liste réseau amis (comme Visites) : acceptés, reçues, envoyées, refusées. */
export function buildFriendNetworkEntries(input: {
  friends: Friend[];
  profileVisits: ProfileVisit[];
  suggestions: SuggestionProfile[];
  friendRequestSentProfilIds: string[];
  friendRequestRejectedProfilIds: string[];
}): FriendNetworkEntry[] {
  const {
    friends,
    profileVisits,
    suggestions,
    friendRequestSentProfilIds,
    friendRequestRejectedProfilIds,
  } = input;

  const map = new Map<string, FriendNetworkEntry>();

  const upsert = (id: string, status: FriendNetworkStatus) => {
    if (isMutualFriend(id, friends)) {
      status = "mutual";
    }
    const profile = resolveProfile(id, friends, profileVisits, suggestions);
    map.set(id, {
      id,
      ...profile,
      status,
      friendRequest: status === "incoming" ? true : profile.friendRequest,
    });
  };

  for (const f of friends) {
    if (f.mutualFriend === true) upsert(f.profilId, "mutual");
  }

  for (const v of profileVisits) {
    if (v.friendRequest && !isMutualFriend(v.id, friends)) {
      upsert(v.id, "incoming");
    }
  }

  for (const id of friendRequestSentProfilIds) {
    if (!isMutualFriend(id, friends)) upsert(id, "sent");
  }

  for (const id of friendRequestRejectedProfilIds) {
    if (!isMutualFriend(id, friends)) upsert(id, "rejected");
  }

  return [...map.values()].sort((a, b) => {
    const sa = STATUS_SORT[a.status];
    const sb = STATUS_SORT[b.status];
    if (sa !== sb) return sa - sb;
    return b.lastVisitAt - a.lastVisitAt;
  });
}

export function countIncomingFriendRequests(entries: FriendNetworkEntry[]): number {
  return entries.filter((e) => e.status === "incoming").length;
}
