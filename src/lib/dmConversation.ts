import type { Conversation, GroupMember } from "../data/mockData";

/** Identifiant DM partagé entre deux utilisateurs (même room Socket.IO). */
export function buildCanonicalDmConversationId(
  userIdA: string,
  userIdB: string,
): string {
  const [a, b] = [userIdA.trim(), userIdB.trim()].sort();
  return `dm-${a}__${b}`;
}

/** Extrait l’autre participant depuis un id `dm-a__b` ou `dm-{peer}`. */
export function peerIdFromDmConversationId(
  conversationId: string,
  viewerId: string,
): string | null {
  const cid = conversationId.trim();
  const viewer = viewerId.trim();
  if (!cid.startsWith("dm-") || !viewer) return null;
  const rest = cid.slice(3);
  if (rest.includes("__")) {
    const [a, b] = rest.split("__");
    if (a === viewer) return b || null;
    if (b === viewer) return a || null;
    return null;
  }
  return rest && rest !== viewer ? rest : null;
}

export function findDmConversationByPeer(
  conversations: readonly Conversation[],
  peerProfilId: string,
  viewerId: string,
): Conversation | undefined {
  const peer = peerProfilId.trim();
  const viewer = viewerId.trim();
  if (!peer || !viewer) return undefined;
  const canonical = buildCanonicalDmConversationId(viewer, peer);
  return conversations.find(
    (c) =>
      c.type === "dm" &&
      (c.id === canonical ||
        c.id === `dm-${peer}` ||
        c.id.startsWith(`dm-${peer}-`) ||
        c.members.some((m) => !m.isSelf && m.profilId === peer)),
  );
}

/** Remappe l'id reçu par socket vers la conversation locale (DM asymétriques legacy). */
export function resolveLocalDmConversationId(
  remoteConversationId: string,
  authorUserId: string | undefined,
  conversations: readonly Conversation[],
  viewerId: string | undefined,
): string {
  if (conversations.some((c) => c.id === remoteConversationId)) {
    return remoteConversationId;
  }
  if (!viewerId?.trim() || !remoteConversationId.startsWith("dm-")) {
    return remoteConversationId;
  }

  let peerId = peerIdFromDmConversationId(remoteConversationId, viewerId);

  if (!peerId && authorUserId && authorUserId !== viewerId) {
    peerId = authorUserId;
  }
  if (!peerId) return remoteConversationId;

  const local = findDmConversationByPeer(conversations, peerId, viewerId);
  return local?.id ?? remoteConversationId;
}

export function dmRecipientUserIds(conv: Conversation | undefined): string[] {
  if (!conv) return [];
  const fromMembers = conv.members
    .filter((m) => !m.isSelf && m.profilId?.trim())
    .map((m) => m.profilId!.trim());
  if (fromMembers.length > 0) return [...new Set(fromMembers)];

  // Fallback : id canonique dm-a__b même si members.profilId manquant (legacy).
  const selfId = conv.members.find((m) => m.isSelf)?.profilId?.trim();
  if (!selfId) return [];
  const peer = peerIdFromDmConversationId(conv.id, selfId);
  return peer ? [peer] : [];
}

/** Vue destinataire d’un DM (titre = expéditeur, isSelf côté destinataire). */
export function dmConversationForPeerView(input: {
  conv: Conversation;
  viewerId: string;
  viewerDisplayName: string;
  viewerAvatarUrl?: string;
  peerId: string;
  unreadCount?: number;
}): Conversation {
  const {
    conv,
    viewerId,
    viewerDisplayName,
    viewerAvatarUrl,
    peerId,
    unreadCount,
  } = input;
  const peerMember: GroupMember = {
    id: `u-${viewerId}`,
    name: viewerDisplayName.trim() || "Moi",
    isSelf: false,
    profilId: viewerId,
    avatarUrl: viewerAvatarUrl,
    avatarGradient: conv.avatarGradient,
  };
  const selfMember: GroupMember = {
    id: "me",
    name: "Moi",
    isSelf: true,
    profilId: peerId,
    avatarGradient: ["#78909C", "#546E7A"],
  };
  return {
    ...conv,
    title: viewerDisplayName.trim() || conv.title,
    unreadCount: unreadCount ?? conv.unreadCount,
    members: [peerMember, selfMember],
    memberCount: 2,
  };
}
