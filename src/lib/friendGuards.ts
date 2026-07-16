import type { Friend } from "../data/mockData";
import { resolveAvatarUrl } from "./avatarUrl";

export function isSelfProfilId(
  profilId: string,
  viewerId?: string | null,
): boolean {
  const pid = profilId.trim();
  const uid = viewerId?.trim() ?? "";
  return !!pid && !!uid && pid === uid;
}

export function filterOutSelfFriends(
  friends: Friend[],
  viewerId?: string | null,
): Friend[] {
  return friends.filter((f) => !isSelfProfilId(f.profilId, viewerId));
}

export function buildMutualFriendRecord(params: {
  profilId: string;
  name: string;
  avatarUrl?: string;
  age?: number | null;
  city?: string;
}): Friend {
  const name = params.name.trim() || "Moi";
  return {
    profilId: params.profilId.trim(),
    name,
    pseudo: name,
    age: params.age ?? null,
    city: params.city?.trim() ?? "",
    imageUrl: resolveAvatarUrl(params.avatarUrl),
    eventsInCommon: 0,
    mainChatConversationId: "",
    mutualFriend: true,
  };
}
