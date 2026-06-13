import type { Conversation, Event } from "../data/mockData";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { isAdminAccount } from "./accountRoles";
import {
  buildEventGroupMembers,
  eventGroupMemberCount,
} from "./eventGroupMembers";
import { viewerParticipatesInEvent } from "./eventVisibility";
import type { ViewerContext } from "./eventHost";

function authViewerContext(): ViewerContext | null {
  const user = useAuthStore.getState().user;
  return user ? { id: user.id, displayName: user.displayName } : null;
}

/** `null` = accès total (mode admin actif). */
export type ConversationAccessScope = ReadonlySet<string> | null;

export type MessageLoadScope =
  | { mode: "admin" }
  | { mode: "member"; conversationIds: ReadonlySet<string> };

export function viewerIsConversationMember(conversation: Conversation): boolean {
  return conversation.members.some((m) => m.isSelf);
}

export function resolveConversationAccessScope(input: {
  /** Mode admin UI (pas seulement compte staff). */
  adminModeActive: boolean;
  isStaffAccount: boolean;
  conversations: Conversation[];
  events: Event[];
}): ConversationAccessScope {
  if (input.adminModeActive && input.isStaffAccount) return null;

  const ids = new Set<string>();
  for (const c of input.conversations) {
    const cid = c.id?.trim();
    if (!cid) continue;
    if (viewerIsConversationMember(c)) ids.add(cid);
  }
  const viewer = authViewerContext();
  for (const e of input.events) {
    if (!viewerParticipatesInEvent(e, viewer)) continue;
    const cid = e.conversationId?.trim();
    if (cid) ids.add(cid);
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

  const viewer = authViewerContext();
  const msg = useMessagingStore.getState();
  const viewerId = viewer?.id?.trim() || null;
  for (const e of events) {
    const cid = e.conversationId?.trim();
    if (!cid || existing.has(cid) || !viewerParticipatesInEvent(e, viewer)) continue;
    existing.add(cid);
    const members = buildEventGroupMembers(e, {
      viewerId,
      viewerDisplayName: msg.viewerProfileDisplayName,
      viewerAvatarUrl: msg.viewerProfileAvatarUrl,
      friends: msg.friends,
      suggestions: msg.suggestions,
    });
    added.push({
      id: cid,
      title: e.title,
      type: "group",
      lastMessagePreview: "",
      avatarGradient: ["#4a5568", "#2d3748"] as const,
      unreadCount: 0,
      updatedAt: Date.now(),
      isFavorite: false,
      members,
      memberCount: eventGroupMemberCount(e, members),
    });
  }

  return added;
}

export function toMessageLoadScope(
  adminModeActive: boolean,
  isStaffAccount: boolean,
  conversationScope: ConversationAccessScope,
): MessageLoadScope {
  if (adminModeActive && isStaffAccount) return { mode: "admin" };
  if (conversationScope === null) return { mode: "admin" };
  return { mode: "member", conversationIds: conversationScope };
}

export function resolveMessageAccessFromStores(): MessageLoadScope {
  const user = useAuthStore.getState().user;
  const isStaff = userIsAppAdmin(user);
  const adminModeActive = useMessagingStore.getState().isAdmin;
  if (adminModeActive && isStaff) return { mode: "admin" };

  const msg = useMessagingStore.getState();
  const ids = resolveConversationAccessScope({
    adminModeActive,
    isStaffAccount: isStaff,
    conversations: msg.conversations,
    events: msg.events,
  });
  return { mode: "member", conversationIds: ids ?? new Set<string>() };
}

/** Admin Sheets/API : scope élargi seulement si mode admin actif. */
export function resolveSheetsAdminScope(
  user: { id?: string; email?: string; isAdmin?: boolean } | null | undefined,
): boolean {
  if (!userIsAppAdmin(user)) return false;
  return useMessagingStore.getState().isAdmin;
}
