import type { Conversation } from "../data/mockData";

/** Identifiant DM partagé entre deux utilisateurs (même room Socket.IO). */
export function buildCanonicalDmConversationId(
  userIdA: string,
  userIdB: string,
): string {
  const [a, b] = [userIdA.trim(), userIdB.trim()].sort();
  return `dm-${a}__${b}`;
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

  const rest = remoteConversationId.slice(3);
  let peerId: string | null = null;

  if (rest.includes("__")) {
    const [a, b] = rest.split("__");
    peerId = a === viewerId ? b : b === viewerId ? a : null;
  } else if (rest !== viewerId) {
    peerId = rest;
  }

  if (!peerId && authorUserId && authorUserId !== viewerId) {
    peerId = authorUserId;
  }
  if (!peerId) return remoteConversationId;

  const local = findDmConversationByPeer(conversations, peerId, viewerId);
  return local?.id ?? remoteConversationId;
}

export function dmRecipientUserIds(conv: Conversation | undefined): string[] {
  if (!conv) return [];
  return [
    ...new Set(
      conv.members
        .filter((m) => !m.isSelf && m.profilId?.trim())
        .map((m) => m.profilId!.trim()),
    ),
  ];
}
