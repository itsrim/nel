import type { AppNotification } from "../data/mockData";

export const NOTIFICATION_INBOX_KIND = "inbox";

type InboxNotificationEntry = {
  id: string;
  createdAt: number;
  kind: AppNotification["kind"];
  eventId?: string;
  eventTitle?: string;
  inviteeName?: string;
  inviteeProfilId?: string;
  conversationId?: string;
  senderName?: string;
  messagePreview?: string;
};

function toEntry(n: AppNotification): InboxNotificationEntry {
  return {
    id: n.id,
    createdAt: n.createdAt,
    kind: n.kind,
    ...(n.eventId ? { eventId: n.eventId } : {}),
    ...(n.eventTitle ? { eventTitle: n.eventTitle } : {}),
    ...(n.inviteeName ? { inviteeName: n.inviteeName } : {}),
    ...(n.inviteeProfilId ? { inviteeProfilId: n.inviteeProfilId } : {}),
    ...(n.conversationId ? { conversationId: n.conversationId } : {}),
    ...(n.senderName ? { senderName: n.senderName } : {}),
    ...(n.messagePreview ? { messagePreview: n.messagePreview } : {}),
  };
}

function fromEntry(entry: InboxNotificationEntry): AppNotification {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    kind: entry.kind,
    eventId: entry.eventId,
    eventTitle: entry.eventTitle,
    inviteeName: entry.inviteeName,
    inviteeProfilId: entry.inviteeProfilId,
    conversationId: entry.conversationId,
    senderName: entry.senderName,
    messagePreview: entry.messagePreview,
  };
}

export function serializeNotificationInbox(
  notifications: readonly AppNotification[],
): string {
  const unread = notifications.filter((n) => n.readAt == null);
  return JSON.stringify(unread.map(toEntry));
}

export function parseNotificationInbox(raw: string): AppNotification[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AppNotification[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const createdAt = Number(row.createdAt);
      if (
        typeof row.id !== "string" ||
        typeof row.kind !== "string" ||
        !Number.isFinite(createdAt)
      ) {
        continue;
      }
      out.push(
        fromEntry({
          id: row.id,
          createdAt,
          kind: row.kind as AppNotification["kind"],
          eventId:
            typeof row.eventId === "string" ? row.eventId : undefined,
          eventTitle:
            typeof row.eventTitle === "string" ? row.eventTitle : undefined,
          inviteeName:
            typeof row.inviteeName === "string" ? row.inviteeName : undefined,
          inviteeProfilId:
            typeof row.inviteeProfilId === "string"
              ? row.inviteeProfilId
              : undefined,
          conversationId:
            typeof row.conversationId === "string"
              ? row.conversationId
              : undefined,
          senderName:
            typeof row.senderName === "string" ? row.senderName : undefined,
          messagePreview:
            typeof row.messagePreview === "string"
              ? row.messagePreview
              : undefined,
        }),
      );
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function mergeNotificationInbox(
  base: readonly AppNotification[],
  incoming: readonly AppNotification[],
): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const n of base) {
    if (n.readAt != null) continue;
    map.set(n.id, n);
  }
  for (const n of incoming) {
    if (n.readAt != null) continue;
    map.set(n.id, n);
  }
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Une ligne Sheets / utilisateur — JSON dans `messagePreview`, kind = inbox. */
export function buildNotificationInboxRow(
  userId: string,
  notifications: readonly AppNotification[],
): Record<string, string> {
  const unread = mergeNotificationInbox([], notifications);
  const updatedAt = unread[0]?.createdAt ?? Date.now();
  return {
    userId,
    id: userId,
    createdAt: String(updatedAt),
    kind: NOTIFICATION_INBOX_KIND,
    eventId: "",
    eventTitle: "",
    inviteeName: "",
    inviteeProfilId: "",
    conversationId: "",
    senderName: "",
    messagePreview: serializeNotificationInbox(unread),
    readAt: "",
    deleted: "false",
  };
}

export function isNotificationInboxRow(row: Record<string, string>): boolean {
  return row.kind?.trim() === NOTIFICATION_INBOX_KIND;
}
