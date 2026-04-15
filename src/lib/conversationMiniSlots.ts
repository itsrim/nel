import type { Conversation, Event, Friend, GroupMember } from '../data/mockData';

/** Photo membre (moi → profil, ami → imageUrl) ou absence. */
export function resolveMemberPhotoUrl(
  member: GroupMember | undefined,
  friends: Friend[],
  viewerProfileAvatarUrl: string,
): string | undefined {
  if (!member) return undefined;
  if (member.isSelf) return viewerProfileAvatarUrl;
  if (member.profilId) {
    return friends.find((f) => f.profilId === member.profilId)?.imageUrl;
  }
  return undefined;
}

export type ConversationMiniSlot = { src: string; hasImage: boolean };

/**
 * Une case par index : photo du iᵉ membre si dispo, sinon couverture de la sortie liée, sinon vide (dégradé).
 */
export function buildConversationMiniSlots(
  conversation: Conversation,
  linkedEvent: Event | undefined,
  friends: Friend[],
  viewerProfileAvatarUrl: string,
  count: number,
): ConversationMiniSlot[] {
  const cover = linkedEvent?.imageUri?.trim() ?? '';
  const members = conversation.members ?? [];
  const out: ConversationMiniSlot[] = [];
  for (let i = 0; i < count; i++) {
    const photo = resolveMemberPhotoUrl(members[i], friends, viewerProfileAvatarUrl);
    if (photo) out.push({ src: photo, hasImage: true });
    else if (cover) out.push({ src: cover, hasImage: true });
    else out.push({ src: '', hasImage: false });
  }
  return out;
}
