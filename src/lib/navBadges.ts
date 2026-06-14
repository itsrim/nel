import type { AppNotification, Conversation, Event } from "../data/mockData";
import {
  isConversationAccessible,
  resolveConversationAccessScope,
  userIsAppAdmin,
} from "./accessScope";

export function countUnreadNotifications(
  notifications: readonly AppNotification[],
): number {
  return notifications.filter((n) => n.readAt == null).length;
}

export function countUnreadChatMessages(input: {
  adminModeActive: boolean;
  user: { id?: string; email?: string; isAdmin?: boolean } | null;
  conversations: Conversation[];
  events: Event[];
}): number {
  const scope = resolveConversationAccessScope({
    adminModeActive: input.adminModeActive,
    isStaffAccount: userIsAppAdmin(input.user),
    conversations: input.conversations,
    events: input.events,
  });

  const accessible =
    scope === null
      ? input.conversations
      : input.conversations.filter(
          (c) =>
            isConversationAccessible(c.id, scope) &&
            (c.members.length === 0 || c.members.some((m) => m.isSelf)),
        );

  return accessible.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
}
