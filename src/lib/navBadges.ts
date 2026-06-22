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

function isPendingIncomingFriendRequest(
  visit: ProfileVisit,
  friends: readonly Friend[],
  friendRequestRejectedProfilIds: readonly string[],
): boolean {
  if (!visit.friendRequest) return false;
  if (friendRequestRejectedProfilIds.includes(visit.id)) return false;
  return !friends.some((f) => f.profilId === visit.id && f.mutualFriend === true);
}

function hasFriendRequestNotification(
  profilId: string,
  notifications: readonly AppNotification[],
): boolean {
  return notifications.some(
    (n) =>
      n.kind === "friend_request_received" && n.inviteeProfilId === profilId,
  );
}

/** Pastille Profil (barre du bas) : notifs non lues + demandes sans notif associée. */
export function countProfileNavBadge(input: {
  appNotifications: readonly AppNotification[];
  profileVisits: readonly ProfileVisit[];
  friends: readonly Friend[];
  friendRequestRejectedProfilIds: readonly string[];
}): number {
  const unread = countUnreadNotifications(input.appNotifications);
  const orphanIncoming = input.profileVisits.filter(
    (v) =>
      isPendingIncomingFriendRequest(
        v,
        input.friends,
        input.friendRequestRejectedProfilIds,
      ) && !hasFriendRequestNotification(v.id, input.appNotifications),
  ).length;
  return unread + orphanIncoming;
}

export function countEventNavBadge(input: {
  appNotifications: readonly AppNotification[];
  events: readonly Event[];
  user: { id?: string } | null;
}): number {
  const eventInvites = input.appNotifications.filter(
    (n) =>
      n.kind === "event_invite_received" &&
      n.readAt == null &&
      (!n.inviteeProfilId || n.inviteeProfilId === input.user?.id),
  );
  const eventUpdates = input.appNotifications.filter(
    (n) =>
      (n.kind === "event_participant_joined" ||
        n.kind === "event_participant_left" ||
        n.kind === "event_waitlist_joined" ||
        n.kind === "event_waitlist_left" ||
        n.kind === "event_waitlist_accepted" ||
        n.kind === "event_waitlist_rejected") &&
      n.readAt == null &&
      n.eventId != null &&
      input.events.some((e) => e.id === n.eventId),
  );
  return eventInvites.length + eventUpdates.length;
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
