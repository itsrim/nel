/**
 * Persistance chat : cache local + Google Sheets.
 * - Une ligne Sheets par conversation (`text` = JSON de tous les messages).
 * - Fenêtre active : 7 jours après la création du fil ou la date de l'événement lié.
 */

import type { MessageLoadScope } from "./accessScope";
import { upsertSheetRow } from "./appSheetPersistence";
import {
  isGoogleSheetsReadConfigured,
  isGoogleSheetsWriteConfigured,
  sheetGet,
} from "./googleSheetsDb";
import {
  buildMessageThreadRow,
  mergeThreadMessages,
  messagesFromSheetRow,
  parseThreadText,
  serializeThreadText,
  threadAnchorMs,
  type MessageThreadEntry,
} from "./messageThread";

export interface PersistedMessage {
  conversationId: string;
  id: string;
  authorId?: string;
  authorName: string;
  text: string;
  sentAt: number;
}

export type { MessageThreadEntry };

const STORAGE_KEY_PREFIX = "nel_chat_history_threads";
/** Ancien cache (1 message / ligne CSV). */
const LEGACY_STORAGE_KEY_PREFIX = "nel_chat_history_csv";

/** conversationId → dernier updatedAt synchronisé vers Sheets. */
const syncedThreadUpdatedAt = new Map<string, number>();

function getCurrentUserIdForSheets(): string {
  try {
    const raw = localStorage.getItem("nel_auth_user");
    if (!raw) return "";
    const user = JSON.parse(raw) as { id?: string };
    return user.id?.trim() ?? "";
  } catch {
    return "";
  }
}

function storageKeyForUser(userId?: string): string {
  const id = (userId ?? getCurrentUserIdForSheets()).trim();
  return id ? `${STORAGE_KEY_PREFIX}_${id}` : STORAGE_KEY_PREFIX;
}

function legacyStorageKeyForUser(userId?: string): string {
  const id = (userId ?? getCurrentUserIdForSheets()).trim();
  return id ? `${LEGACY_STORAGE_KEY_PREFIX}_${id}` : LEGACY_STORAGE_KEY_PREFIX;
}

function isConversationInScope(conversationId: string, scope: MessageLoadScope): boolean {
  if (scope.mode === "admin") return true;
  const ids = scope.conversationIds;
  if (!ids) return false;
  return ids.has(conversationId.trim());
}

function filterMessagesForScope(
  messagesByConversation: Record<string, unknown[]>,
  scope: MessageLoadScope,
): Record<string, PersistedMessage[]> {
  const out: Record<string, PersistedMessage[]> = {};
  for (const [convId, messages] of Object.entries(messagesByConversation)) {
    if (!isConversationInScope(convId, scope)) continue;
    const kept = messages.map((m) => m as PersistedMessage);
    if (kept.length > 0) out[convId] = kept;
  }
  return out;
}

function filterMessageListForScope(
  messages: PersistedMessage[],
  scope: MessageLoadScope,
): PersistedMessage[] {
  return messages.filter((m) => isConversationInScope(m.conversationId, scope));
}

function groupMessagesByConversation(
  messages: PersistedMessage[],
): Record<string, PersistedMessage[]> {
  const out: Record<string, PersistedMessage[]> = {};
  for (const m of messages) {
    if (!out[m.conversationId]) out[m.conversationId] = [];
    out[m.conversationId].push(m);
  }
  return out;
}

function saveHistoryLocal(
  messagesByConversation: Record<string, PersistedMessage[]>,
  userId?: string,
): void {
  try {
    localStorage.setItem(
      storageKeyForUser(userId),
      JSON.stringify(messagesByConversation),
    );
  } catch (err) {
    console.error("Failed to save chat history to localStorage:", err);
  }
}

function loadLegacyCsvMessages(userId: string): PersistedMessage[] {
  try {
    const csv = localStorage.getItem(legacyStorageKeyForUser(userId));
    if (!csv?.trim()) return [];
    const lines = csv.split(/\r?\n/).slice(1);
    const messages: PersistedMessage[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(",");
      if (parts.length < 6) continue;
      const sentAt = parseInt(parts[5], 10);
      if (!Number.isFinite(sentAt)) continue;
      messages.push({
        conversationId: parts[0],
        id: parts[1],
        authorId: parts[2] || undefined,
        authorName: parts[3],
        text: parts[4],
        sentAt,
      });
    }
    return messages;
  } catch {
    return [];
  }
}

function loadHistoryLocal(userId: string, scope: MessageLoadScope): PersistedMessage[] {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, PersistedMessage[]>;
      const flat = Object.values(parsed).flat();
      return filterMessageListForScope(flat, scope);
    }
  } catch (err) {
    console.error("Failed to load chat threads from localStorage:", err);
  }
  return filterMessageListForScope(loadLegacyCsvMessages(userId), scope);
}

async function loadHistoryFromSheets(
  scope: MessageLoadScope,
  eventDateKeyByConversationId: Record<string, string>,
): Promise<PersistedMessage[]> {
  const rows = await sheetGet<Record<string, string>>("messages");
  const byConversation = new Map<string, PersistedMessage[]>();

  for (const row of rows) {
    const convId = row.conversationId?.trim();
    if (!convId) continue;
    if (!isConversationInScope(convId, scope)) continue;

    const parsed = messagesFromSheetRow(
      row,
      eventDateKeyByConversationId[convId],
    );
    if (parsed.length === 0) continue;

    const prev = byConversation.get(convId) ?? [];
    byConversation.set(convId, [...prev, ...parsed]);
  }

  const messages: PersistedMessage[] = [];
  for (const [convId, list] of byConversation) {
    const merged = mergeThreadMessages(
      list.map(({ id, authorId, authorName, text, sentAt }) => ({
        id,
        authorId,
        authorName,
        text,
        sentAt,
      })),
    );
    merged.forEach((m) => {
      messages.push({ ...m, conversationId: convId });
    });
    const updatedAt = Math.max(...merged.map((m) => m.sentAt));
    syncedThreadUpdatedAt.set(convId, updatedAt);
  }

  return messages;
}

async function syncHistoryToSheets(
  messagesByConversation: Record<string, PersistedMessage[]>,
  userId: string,
  eventDateKeyByConversationId: Record<string, string>,
): Promise<void> {
  if (!isGoogleSheetsWriteConfigured() || !userId) return;

  for (const [convId, messages] of Object.entries(messagesByConversation)) {
    if (messages.length === 0) continue;

    const updatedAt = Math.max(...messages.map((m) => m.sentAt));
    if (syncedThreadUpdatedAt.get(convId) === updatedAt) continue;

    const row = buildMessageThreadRow({
      conversationId: convId,
      messages,
      userId,
      eventDateKey: eventDateKeyByConversationId[convId],
    });
    if (!row) continue;

    try {
      await upsertSheetRow("messages", convId, row);
      syncedThreadUpdatedAt.set(convId, updatedAt);
    } catch (err) {
      console.error(`Failed to sync message thread ${convId}:`, err);
    }
  }
}

export type SaveHistoryOptions = {
  eventDateKeyByConversationId?: Record<string, string>;
};

/** Sauvegarde locale + sync Sheets (1 ligne / conversation). */
export function saveHistory(
  messagesByConversation: Record<string, unknown[]>,
  scope: MessageLoadScope,
  options?: SaveHistoryOptions,
): void {
  const userId = getCurrentUserIdForSheets();
  if (!userId) return;

  const inScope = filterMessagesForScope(messagesByConversation, scope);
  saveHistoryLocal(inScope, userId);
  if (isGoogleSheetsWriteConfigured()) {
    void syncHistoryToSheets(
      inScope,
      userId,
      options?.eventDateKeyByConversationId ?? {},
    );
  }
}

export type LoadHistoryOptions = {
  eventDateKeyByConversationId?: Record<string, string>;
};

export function buildEventDateKeyByConversationId(
  events: readonly { conversationId?: string; dateKey?: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of events) {
    const cid = e.conversationId?.trim();
    const dk = e.dateKey?.trim();
    if (cid && dk) map[cid] = dk;
  }
  return map;
}

/** Charge les messages visibles selon le périmètre (groupes membres ou admin = tout). */
export async function loadHistory(
  scope: MessageLoadScope,
  options?: LoadHistoryOptions,
): Promise<PersistedMessage[]> {
  const userId = getCurrentUserIdForSheets();
  if (!userId) return [];

  const eventDateKeyByConversationId = options?.eventDateKeyByConversationId ?? {};

  if (isGoogleSheetsReadConfigured()) {
    try {
      const remote = await loadHistoryFromSheets(scope, eventDateKeyByConversationId);
      if (remote.length > 0) {
        saveHistoryLocal(groupMessagesByConversation(remote), userId);
        return remote;
      }
    } catch (err) {
      console.error("Google Sheets load failed, fallback localStorage:", err);
    }
  }

  return loadHistoryLocal(userId, scope);
}

export async function updateMessageInSheets(
  conversationId: string,
  messageId: string,
  patch: Partial<Pick<PersistedMessage, "text" | "authorName">>,
  options?: {
    allMessages?: PersistedMessage[];
    userId?: string;
    eventDateKey?: string;
  },
): Promise<void> {
  const convId = conversationId.trim();
  const id = messageId.trim();
  if (!convId || !id) return;

  const rows = await sheetGet<Record<string, string>>("messages");
  const row = rows.find((r) => r.id === convId || r.conversationId === convId);
  const existing = row?.text ? parseThreadText(row.text) ?? [] : [];
  const merged = mergeThreadMessages(
    existing,
    options?.allMessages?.map(({ id: mid, authorId, authorName, text, sentAt }) => ({
      id: mid,
      authorId,
      authorName,
      text,
      sentAt,
    })) ?? [],
  ).map((m) =>
    m.id === id
      ? {
          ...m,
          ...(patch.text != null ? { text: patch.text } : {}),
          ...(patch.authorName != null ? { authorName: patch.authorName } : {}),
        }
      : m,
  );

  const userId = options?.userId?.trim() || getCurrentUserIdForSheets();
  const threadRow = buildMessageThreadRow({
    conversationId: convId,
    messages: merged.map((m) => ({ ...m, conversationId: convId })),
    userId,
    eventDateKey: options?.eventDateKey,
  });
  if (!threadRow) return;
  await upsertSheetRow("messages", convId, threadRow);
}

export { serializeThreadText, parseThreadText, threadAnchorMs };
export { isGoogleSheetsReadConfigured, isGoogleSheetsWriteConfigured };
