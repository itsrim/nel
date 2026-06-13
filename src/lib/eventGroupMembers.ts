import type { Event, Friend, GroupMember, SuggestionProfile } from "../data/mockData";
import { resolveAvatarUrl } from "./avatarUrl";
import { eventOrganizerUserId } from "./eventHost";
import { VIEWER_KARMA_PARTICIPANT_ID } from "./karma";

const ORGANIZER_GRADIENT = ["#FFD60A", "#FF9F0A"] as const;
const MEMBER_GRADIENT = ["#78909C", "#546E7A"] as const;

function resolveProfile(
  userId: string,
  friends: Friend[],
  suggestions: SuggestionProfile[] = [],
): { name?: string; avatarUrl?: string } {
  const friend = friends.find(
    (f) => f.profilId === userId || `u-${f.profilId}` === userId,
  );
  if (friend) return { name: friend.name, avatarUrl: friend.imageUrl };

  const suggestion = suggestions.find((s) => s.id === userId);
  if (suggestion) {
    return { name: suggestion.pseudo, avatarUrl: suggestion.imageUrl };
  }

  return {};
}

/** Identifiants userId à afficher dans le roster (organisateur + inscrits + legacy karma). */
export function collectEventParticipantUserIds(
  event: Event,
  viewerId: string | null,
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const organizerId = eventOrganizerUserId(event);

  const push = (id: string | undefined) => {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    ordered.push(trimmed);
  };

  push(organizerId);
  for (const pid of event.registeredParticipantIds ?? []) {
    push(pid);
  }

  if (
    viewerId &&
    viewerId !== organizerId &&
    !(event.registeredParticipantIds ?? []).includes(viewerId) &&
    (event.karmaJoinPaidProfilIds ?? []).includes(VIEWER_KARMA_PARTICIPANT_ID)
  ) {
    push(viewerId);
  }

  return ordered;
}

/** Roster complet d'un fil sortie : organisateur + inscrits, avec isSelf pour le viewer. */
export function buildEventGroupMembers(
  event: Event,
  opts: {
    viewerId: string | null;
    viewerDisplayName: string;
    viewerAvatarUrl: string;
    friends: Friend[];
    suggestions?: SuggestionProfile[];
    /** false = quitter le fil sans marquer isSelf (organisateur / participant). */
    markViewerAsSelf?: boolean;
  },
): GroupMember[] {
  const members: GroupMember[] = [];
  const viewerId = opts.viewerId?.trim() || null;
  const organizerId = eventOrganizerUserId(event);
  const markSelf = opts.markViewerAsSelf !== false;
  const suggestions = opts.suggestions ?? [];
  const participantIds = collectEventParticipantUserIds(event, viewerId);

  if (participantIds.length === 0 && event.hostName?.trim()) {
    const viewerIsLegacyHost =
      markSelf &&
      event.hostName.trim() === opts.viewerDisplayName.trim();
    members.push({
      id: viewerIsLegacyHost ? "me" : "host-legacy",
      name: event.hostName.trim(),
      isSelf: viewerIsLegacyHost,
      avatarUrl: resolveAvatarUrl(
        viewerIsLegacyHost ? opts.viewerAvatarUrl : event.hostAvatar,
      ),
      avatarGradient: ORGANIZER_GRADIENT,
    });
    return members;
  }

  for (const participantId of participantIds) {
    const isOrganizer = !!(organizerId && participantId === organizerId);
    const isSelf =
      markSelf &&
      ((viewerId === participantId) ||
        (isOrganizer && viewerId === organizerId));
    const profile = resolveProfile(participantId, opts.friends, suggestions);

    if (isOrganizer) {
      members.push({
        id: isSelf ? "me" : `host-${participantId}`,
        name: isSelf
          ? opts.viewerDisplayName.trim() || "Moi"
          : event.hostName?.trim() || profile.name || "Organisateur",
        isSelf: !!(markSelf && viewerId === organizerId),
        profilId: participantId,
        avatarUrl: resolveAvatarUrl(
          viewerId === organizerId && markSelf
            ? opts.viewerAvatarUrl
            : event.hostAvatar || profile.avatarUrl,
        ),
        avatarGradient: ORGANIZER_GRADIENT,
      });
      continue;
    }

    members.push({
      id: isSelf ? "me" : `p-${participantId}`,
      name: isSelf
        ? opts.viewerDisplayName.trim() || "Moi"
        : profile.name?.trim() || "Participant",
      isSelf: !!(markSelf && viewerId === participantId),
      profilId: participantId,
      avatarUrl: isSelf
        ? resolveAvatarUrl(opts.viewerAvatarUrl)
        : profile.avatarUrl
          ? resolveAvatarUrl(profile.avatarUrl)
          : undefined,
      avatarGradient: MEMBER_GRADIENT,
    });
  }

  return members;
}

export function eventGroupMemberCount(event: Event, members: GroupMember[]): number {
  return Math.max(event.participantCount, members.length);
}
