import { parseDateKeyLocal } from "./eventDateKey";

export const THREAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type MessageThreadEntry = {
  id: string;
  authorId?: string;
  authorName: string;
  text: string;
  sentAt: number;
};

export type PersistedMessage = MessageThreadEntry & {
  conversationId: string;
};

export function threadAnchorMs(
  messages: readonly MessageThreadEntry[],
  eventDateKey?: string,
): number {
  if (eventDateKey?.trim()) {
    return parseDateKeyLocal(eventDateKey.trim()).getTime();
  }
  if (messages.length === 0) return Date.now();
  return Math.min(...messages.map((m) => m.sentAt));
}

export function isThreadActive(anchorMs: number, now = Date.now()): boolean {
  return now <= anchorMs + THREAD_TTL_MS;
}

/** Peut-on encore envoyer un message dans ce fil ? */
export function canWriteToConversationThread(input: {
  messages: readonly MessageThreadEntry[];
  eventDateKey?: string;
  messagingBlocked?: boolean;
  now?: number;
}): boolean {
  if (input.messagingBlocked) return false;
  const anchor = threadAnchorMs(input.messages, input.eventDateKey);
  return isThreadActive(anchor, input.now);
}

/** Messages conservés dans la fenêtre [ancre, ancre + 7 j]. */
export function filterMessagesInThreadWindow(
  messages: readonly MessageThreadEntry[],
  anchorMs: number,
  now = Date.now(),
): MessageThreadEntry[] {
  if (!isThreadActive(anchorMs, now)) return [];
  const end = anchorMs + THREAD_TTL_MS;
  return [...messages]
    .filter((m) => m.sentAt >= anchorMs && m.sentAt <= end)
    .sort((a, b) => a.sentAt - b.sentAt);
}

export function mergeThreadMessages(
  ...groups: readonly MessageThreadEntry[][]
): MessageThreadEntry[] {
  const byId = new Map<string, MessageThreadEntry>();
  for (const group of groups) {
    for (const m of group) {
      if (!m.id?.trim()) continue;
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

export function serializeThreadText(messages: readonly MessageThreadEntry[]): string {
  return JSON.stringify(messages);
}

export function parseThreadText(raw: string): MessageThreadEntry[] | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: MessageThreadEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const sentAt = Number(row.sentAt);
      if (
        typeof row.id !== "string" ||
        typeof row.authorName !== "string" ||
        typeof row.text !== "string" ||
        !Number.isFinite(sentAt)
      ) {
        continue;
      }
      out.push({
        id: row.id,
        authorId: typeof row.authorId === "string" ? row.authorId : undefined,
        authorName: row.authorName,
        text: row.text,
        sentAt,
      });
    }
    return out;
  } catch {
    return null;
  }
}

/** Ligne Sheets : format fil (JSON) ou ancien format 1 message / ligne. */
export function messagesFromSheetRow(
  row: Record<string, string>,
  eventDateKey?: string,
): PersistedMessage[] {
  const conversationId = row.conversationId?.trim();
  if (!conversationId) return [];

  const thread = row.text ? parseThreadText(row.text) : null;
  if (thread) {
    const anchor = row.createdAt?.trim()
      ? Number(row.createdAt)
      : threadAnchorMs(thread, eventDateKey);
    const kept = filterMessagesInThreadWindow(thread, anchor);
    return kept.map((m) => ({ ...m, conversationId }));
  }

  const sentAt = parseInt(row.sentAt ?? "", 10);
  if (
    !row.id?.trim() ||
    !row.authorName?.trim() ||
    !row.text?.trim() ||
    !Number.isFinite(sentAt)
  ) {
    return [];
  }

  const legacy: MessageThreadEntry = {
    id: row.id.trim(),
    authorId: row.authorId?.trim() || undefined,
    authorName: row.authorName.trim(),
    text: row.text.trim(),
    sentAt,
  };
  const anchor = threadAnchorMs([legacy], eventDateKey);
  const kept = filterMessagesInThreadWindow([legacy], anchor);
  return kept.map((m) => ({ ...m, conversationId }));
}

export function buildMessageThreadRow(input: {
  conversationId: string;
  messages: readonly PersistedMessage[];
  userId: string;
  eventDateKey?: string;
}): Record<string, string> | null {
  const conversationId = input.conversationId.trim();
  if (!conversationId || input.messages.length === 0) return null;

  const entries = mergeThreadMessages(
    input.messages.map(({ id, authorId, authorName, text, sentAt }) => ({
      id,
      authorId,
      authorName,
      text,
      sentAt,
    })),
  );
  const anchor = threadAnchorMs(entries, input.eventDateKey);
  if (!isThreadActive(anchor)) return null;

  const kept = filterMessagesInThreadWindow(entries, anchor);
  if (kept.length === 0) return null;

  const updatedAt = Math.max(...kept.map((m) => m.sentAt));
  return {
    conversationId,
    id: conversationId,
    text: serializeThreadText(kept),
    createdAt: String(anchor),
    updatedAt: String(updatedAt),
    userId: input.userId.trim(),
  };
}
