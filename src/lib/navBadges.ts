import type {
  AppNotification,
  Conversation,
  Event,
  Friend,
  ProfileVisit,
} from "../data/mockData";
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

/** Pastille Profil (barre du bas) : notifs non lues + demandes reçues sans doublon. */
export function countProfileNavBadge(input: {
  appNotifications: readonly AppNotification[];
  profileVisits: readonly ProfileVisit[];
  friends: readonly Friend[];
}): number {
  const unread = countUnreadNotifications(input.appNotifications);
  const incomingRequests = input.profileVisits.filter(
    (v) =>
      v.friendRequest &&
      !input.friends.some((f) => f.profilId === v.id && f.mutualFriend === true),
  ).length;
  const unreadFriendRequestNotifs = input.appNotifications.filter(
    (n) => n.kind === "friend_request_received" && n.readAt == null,
  ).length;
  const extraIncoming = Math.max(0, incomingRequests - unreadFriendRequestNotifs);
  return unread + extraIncoming;
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
