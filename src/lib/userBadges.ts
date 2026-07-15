import type {
  AdminReportEntry,
  AppNotification,
  Conversation,
  Event,
  Friend,
  ProfileVisit,
  SuggestionProfile,
} from "../data/mockData";
import {
  buildFriendNetworkEntries,
  countIncomingFriendRequests,
} from "./friendsTabNetwork";
import { countProfileNavBadge, countUnreadChatMessages } from "./navBadges";

/** Clés des pastilles utilisateur (nav + onglets). */
export type UserBadgeKey =
  | "chat"
  | "profile"
  | "profile_notifications"
  | "profile_friends"
  | "profile_reports"
  | "chat_visits";

export type UserBadgeCounts = Record<UserBadgeKey, number>;

export type UserBadgeLastSeen = Partial<Record<UserBadgeKey, number>>;

export const EMPTY_USER_BADGE_COUNTS: UserBadgeCounts = {
  chat: 0,
  profile: 0,
  profile_notifications: 0,
  profile_friends: 0,
  profile_reports: 0,
  chat_visits: 0,
};

export type UserBadgeComputeInput = {
  adminModeActive: boolean;
  user: { id?: string; email?: string; isAdmin?: boolean } | null;
  conversations: Conversation[];
  events: Event[];
  appNotifications: readonly AppNotification[];
  profileVisits: readonly ProfileVisit[];
  friends: readonly Friend[];
  suggestions: readonly SuggestionProfile[];
  friendRequestSentProfilIds: readonly string[];
  friendRequestRejectedProfilIds: readonly string[];
  moderationHiddenProfilIds: readonly string[];
  adminReports: readonly AdminReportEntry[];
  lastSeenAt: UserBadgeLastSeen;
};

function visibleVisits(
  profileVisits: readonly ProfileVisit[],
  moderationHiddenProfilIds: readonly string[],
): ProfileVisit[] {
  return profileVisits.filter(
    (v) => !moderationHiddenProfilIds.includes(v.id),
  );
}

function computeChatVisitsBadge(
  visits: ProfileVisit[],
  lastSeenAt?: number,
): number {
  const unseen = lastSeenAt
    ? visits.filter((v) => v.lastVisitAt > lastSeenAt)
    : visits;
  return unseen.filter((v) => v.friendRequest).length + unseen.length;
}

/** Calcule les compteurs affichés à partir des données source + dernière visite. */
export function computeUserBadgeCounts(
  input: UserBadgeComputeInput,
): UserBadgeCounts {
  const profileNav = countProfileNavBadge({
    appNotifications: input.appNotifications,
    profileVisits: input.profileVisits,
    friends: input.friends,
    friendRequestRejectedProfilIds: input.friendRequestRejectedProfilIds,
  });

  const friendEntries = buildFriendNetworkEntries({
    friends: input.friends,
    profileVisits: input.profileVisits,
    suggestions: input.suggestions,
    friendRequestSentProfilIds: input.friendRequestSentProfilIds,
    friendRequestRejectedProfilIds: input.friendRequestRejectedProfilIds,
    viewerId: input.user?.id,
  });

  let friendsBadge = countIncomingFriendRequests(friendEntries);
  const friendsSeenAt = input.lastSeenAt.profile_friends;
  if (friendsSeenAt) {
    friendsBadge = friendEntries.filter(
      (e) => e.status === "incoming" && e.lastVisitAt > friendsSeenAt,
    ).length;
  }

  const visits = visibleVisits(
    input.profileVisits,
    input.moderationHiddenProfilIds,
  );

  return {
    chat: countUnreadChatMessages({
      adminModeActive: input.adminModeActive,
      user: input.user,
      conversations: input.conversations,
      events: input.events,
    }),
    profile: profileNav,
    profile_notifications: profileNav,
    profile_friends: friendsBadge,
    profile_reports: input.adminReports.filter((r) => !r.read).length,
    chat_visits: computeChatVisitsBadge(visits, input.lastSeenAt.chat_visits),
  };
}

export function parseUserBadgeCounts(raw: string | undefined): UserBadgeCounts {
  if (!raw?.trim()) return { ...EMPTY_USER_BADGE_COUNTS };
  try {
    const parsed = JSON.parse(raw) as Partial<UserBadgeCounts>;
    return { ...EMPTY_USER_BADGE_COUNTS, ...parsed };
  } catch {
    return { ...EMPTY_USER_BADGE_COUNTS };
  }
}

export function parseUserBadgeLastSeen(raw: string | undefined): UserBadgeLastSeen {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as UserBadgeLastSeen;
  } catch {
    return {};
  }
}

export function serializeUserBadgeCounts(counts: UserBadgeCounts): string {
  return JSON.stringify(counts);
}

export function serializeUserBadgeLastSeen(lastSeen: UserBadgeLastSeen): string {
  return JSON.stringify(lastSeen);
}

export type UserBadgeSeenPayload = {
  key: UserBadgeKey;
  lastSeenAt: UserBadgeLastSeen;
  updatedAt: number;
};
