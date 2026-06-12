import type { Conversation, Event } from "../data/mockData";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { isAdminAccount } from "./accountRoles";
import { viewerParticipatesInEvent } from "./eventVisibility";

/** `null` = accès total (admin). */
export type ConversationAccessScope = ReadonlySet<string> | null;

export type MessageLoadScope =
  | { mode: "admin" }
  | { mode: "member"; conversationIds: ReadonlySet<string> };

export function resolveConversationAccessScope(input: {
  isAdmin: boolean;
  conversations: Conversation[];
  events: Event[];
}): ConversationAccessScope {
  if (input.isAdmin) return null;

  const ids = new Set<string>();
  for (const c of input.conversations) {
    if (c.id?.trim()) ids.add(c.id.trim());
  }
  for (const e of input.events) {
    if (!e.conversationId?.trim()) continue;
    if (viewerParticipatesInEvent(e)) ids.add(e.conversationId.trim());
  }
  return ids;
}

export function isConversationAccessible(
  conversationId: string,
  scope: ConversationAccessScope,
): boolean {
  if (scope === null) return true;
  return scope.has(conversationId.trim());
}

export function userIsAppAdmin(
  user: { id?: string; email?: string; isAdmin?: boolean } | null | undefined,
): boolean {
  return isAdminAccount(user ?? null);
}

/** Crée les fils groupe manquants pour les sorties où le viewer participe. */
export function buildMissingParticipantConversations(
  events: Event[],
  conversations: Conversation[],
): Conversation[] {
  const existing = new Set(conversations.map((c) => c.id));
  const added: Conversation[] = [];

  for (const e of events) {
    const cid = e.conversationId?.trim();
    if (!cid || existing.has(cid) || !viewerParticipatesInEvent(e)) continue;
    existing.add(cid);
    added.push({
      id: cid,
      title: e.title,
      type: "group",
      lastMessagePreview: "",
      avatarGradient: ["#4a5568", "#2d3748"] as const,
      unreadCount: 0,
      updatedAt: Date.now(),
      isFavorite: false,
      members: [],
      memberCount: e.participantCount,
    });
  }

  return added;
}

export function toMessageLoadScope(
  isAdmin: boolean,
  conversationScope: ConversationAccessScope,
): MessageLoadScope {
  if (isAdmin || conversationScope === null) return { mode: "admin" };
  return { mode: "member", conversationIds: conversationScope };
}

export function resolveMessageAccessFromStores(): MessageLoadScope {
  const user = useAuthStore.getState().user;
  const isAdmin = userIsAppAdmin(user);
  if (isAdmin) return { mode: "admin" };

  const msg = useMessagingStore.getState();
  const ids = resolveConversationAccessScope({
    isAdmin: false,
    conversations: msg.conversations,
    events: msg.events,
  });
  return { mode: "member", conversationIds: ids ?? new Set<string>() };
}
