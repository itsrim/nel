import type { AppNotification, Event } from "../data/mockData";
import { eventOrganizerUserId } from "./eventHost";
import { syncNotificationToSheetsForUser } from "./appSheetPersistence";

export type EventRosterNotificationKind =
  | "event_participant_joined"
  | "event_participant_left"
  | "event_waitlist_joined"
  | "event_waitlist_left";

export type EventWaitlistDecisionKind =
  | "event_waitlist_accepted"
  | "event_waitlist_rejected";

/** Organisateur + inscrits (hors personne à l'origine de l'action). */
export function collectEventStakeholderUserIds(
  event: Event,
  excludeUserId?: string | null,
): string[] {
  const excluded = excludeUserId?.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (id?: string | null) => {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed) || trimmed === excluded) return;
    seen.add(trimmed);
    out.push(trimmed);
  };
  push(eventOrganizerUserId(event));
  for (const pid of event.registeredParticipantIds ?? []) {
    push(pid);
  }
  return out;
}

function buildNotificationId(recipientUserId: string): string {
  return `n_roster_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_${recipientUserId.slice(0, 12)}`;
}

export function buildEventRosterNotification(
  kind: EventRosterNotificationKind,
  event: Event,
  actorName: string,
  recipientUserId: string,
  actorProfilId?: string,
): AppNotification {
  return {
    id: buildNotificationId(recipientUserId),
    createdAt: Date.now(),
    kind,
    eventId: event.id,
    eventTitle: event.title,
    inviteeName: actorName,
    inviteeProfilId: actorProfilId,
  };
}

/** Notifie les autres membres de la sortie (Sheets + store local si destinataire = viewer). */
export function deliverEventRosterNotifications(options: {
  event: Event;
  kind: EventRosterNotificationKind;
  actorUserId: string | null;
  actorName: string;
  actorProfilId?: string;
  currentUserId: string | null;
  onLocal: (notifications: AppNotification[]) => void;
}): void {
  const recipients = collectEventStakeholderUserIds(
    options.event,
    options.actorUserId,
  );
  if (recipients.length === 0) return;

  const local: AppNotification[] = [];
  for (const recipientId of recipients) {
    const notif = buildEventRosterNotification(
      options.kind,
      options.event,
      options.actorName,
      recipientId,
      options.actorProfilId ?? options.actorUserId ?? undefined,
    );
    syncNotificationToSheetsForUser(notif, recipientId);
    if (recipientId === options.currentUserId) {
      local.push(notif);
    }
  }
  if (local.length > 0) {
    options.onLocal(local);
  }
}

/** Notifie le candidat lorsque l'organisateur accepte ou refuse sa demande. */
export function deliverWaitlistDecisionNotification(options: {
  event: Event;
  kind: EventWaitlistDecisionKind;
  candidateUserId: string;
  organizerName: string;
  currentUserId: string | null;
  onLocal: (notification: AppNotification) => void;
}): void {
  const recipientId = options.candidateUserId.trim();
  if (!recipientId) return;

  const notif: AppNotification = {
    id: `n_wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_${recipientId.slice(0, 12)}`,
    createdAt: Date.now(),
    kind: options.kind,
    eventId: options.event.id,
    eventTitle: options.event.title,
    inviteeName: options.organizerName.trim() || "L'organisateur",
  };
  syncNotificationToSheetsForUser(notif, recipientId);
  if (recipientId === options.currentUserId) {
    options.onLocal(notif);
  }
}
