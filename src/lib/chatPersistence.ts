/**
 * Persistance chat : cache local + Google Sheets.
 * - Utilisateur : messages des groupes / fils dont il est membre (via conversationId).
 * - Admin : tous les messages.
 * - Écriture Sheets : uniquement les messages envoyés par le compte connecté.
 */

import type { MessageLoadScope } from "./accessScope";
import {
  isGoogleSheetsReadConfigured,
  isGoogleSheetsWriteConfigured,
  sheetBatchPost,
  sheetGet,
  sheetPut,
} from "./googleSheetsDb";

export interface PersistedMessage {
  conversationId: string;
  id: string;
  authorId?: string;
  authorName: string;
  text: string;
  sentAt: number;
}

const STORAGE_KEY_PREFIX = "nel_chat_history_csv";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CSV_HEADER = "conversationId,id,authorId,authorName,text,sentAt";

const syncedSheetIds = new Set<string>();

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

function isMessageOwnedByUser(
  msg: Pick<PersistedMessage, "authorId">,
  userId: string,
): boolean {
  if (!userId) return false;
  if (msg.authorId?.trim()) return msg.authorId.trim() === userId;
  return false;
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

function escapeCSV(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeMessagesToCSV(messagesByConversation: Record<string, unknown[]>): string {
  const now = Date.now();
  const rows: string[] = [CSV_HEADER];

  Object.entries(messagesByConversation).forEach(([convId, messages]) => {
    messages.forEach((m) => {
      const msg = m as PersistedMessage;
      if (now - msg.sentAt > RETENTION_MS) return;

      rows.push(
        [
          escapeCSV(convId),
          escapeCSV(msg.id),
          escapeCSV(msg.authorId ?? ""),
          escapeCSV(msg.authorName),
          escapeCSV(msg.text),
          String(msg.sentAt),
        ].join(","),
      );
    });
  });

  return rows.join("\n");
}

export function deserializeCSVToMessages(csv: string): PersistedMessage[] {
  if (!csv?.trim()) return [];

  const lines = csv.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const messages: PersistedMessage[] = [];
  const now = Date.now();
  const header = lines[0].split(",").map((h) => h.trim());
  const hasAuthorId = header.includes("authorId");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        parts.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (hasAuthorId && parts.length >= 6) {
      const sentAt = parseInt(parts[5], 10);
      if (now - sentAt <= RETENTION_MS) {
        messages.push({
          conversationId: parts[0],
          id: parts[1],
          authorId: parts[2] || undefined,
          authorName: parts[3],
          text: parts[4],
          sentAt,
        });
      }
    } else if (parts.length >= 5) {
      const sentAt = parseInt(parts[4], 10);
      if (now - sentAt <= RETENTION_MS) {
        messages.push({
          conversationId: parts[0],
          id: parts[1],
          authorName: parts[2],
          text: parts[3],
          sentAt,
        });
      }
    }
  }

  return messages;
}

function saveHistoryLocal(
  messagesByConversation: Record<string, unknown[]>,
  userId?: string,
): void {
  try {
    const csv = serializeMessagesToCSV(messagesByConversation);
    localStorage.setItem(storageKeyForUser(userId), csv);
  } catch (err) {
    console.error("Failed to save chat history to localStorage:", err);
  }
}

function loadHistoryLocal(userId: string, scope: MessageLoadScope): PersistedMessage[] {
  try {
    const csv = localStorage.getItem(storageKeyForUser(userId));
    if (!csv) return [];
    return filterMessageListForScope(deserializeCSVToMessages(csv), scope);
  } catch (err) {
    console.error("Failed to load chat history from localStorage:", err);
    return [];
  }
}

function rowToMessage(row: Record<string, string>): PersistedMessage | null {
  const sentAt = parseInt(row.sentAt ?? "", 10);
  if (!row.conversationId || !row.id || !row.authorName || !row.text || !Number.isFinite(sentAt)) {
    return null;
  }
  const now = Date.now();
  if (now - sentAt > RETENTION_MS) return null;

  return {
    conversationId: row.conversationId,
    id: row.id,
    authorId: row.authorId?.trim() || undefined,
    authorName: row.authorName,
    text: row.text,
    sentAt,
  };
}

async function loadHistoryFromSheets(scope: MessageLoadScope): Promise<PersistedMessage[]> {
  const rows = await sheetGet<Record<string, string>>("messages");
  const messages: PersistedMessage[] = [];

  for (const row of rows) {
    const msg = rowToMessage(row);
    if (!msg) continue;
    if (!isConversationInScope(msg.conversationId, scope)) continue;
    messages.push(msg);
    syncedSheetIds.add(msg.id);
  }

  return messages;
}

async function syncHistoryToSheets(
  messagesByConversation: Record<string, unknown[]>,
  userId: string,
): Promise<void> {
  if (!isGoogleSheetsWriteConfigured() || !userId) return;

  const now = Date.now();
  const toSync: Record<string, string>[] = [];

  Object.entries(messagesByConversation).forEach(([convId, messages]) => {
    messages.forEach((m) => {
      const msg = m as PersistedMessage;
      if (!isMessageOwnedByUser(msg, userId)) return;
      if (now - msg.sentAt > RETENTION_MS) return;
      if (syncedSheetIds.has(msg.id)) return;

      toSync.push({
        conversationId: convId,
        id: msg.id,
        authorId: msg.authorId ?? userId,
        authorName: msg.authorName,
        text: msg.text,
        sentAt: String(msg.sentAt),
        userId,
      });
      syncedSheetIds.add(msg.id);
    });
  });

  if (toSync.length === 0) return;

  try {
    await sheetBatchPost("messages", toSync);
  } catch (err) {
    toSync.forEach((row) => syncedSheetIds.delete(row.id));
    console.error("Failed to sync messages to Google Sheets:", err);
  }
}

/** Sauvegarde locale (fils accessibles) + sync Sheets (messages envoyés par le compte). */
export function saveHistory(
  messagesByConversation: Record<string, unknown[]>,
  scope: MessageLoadScope,
): void {
  const userId = getCurrentUserIdForSheets();
  if (!userId) return;

  const inScope = filterMessagesForScope(messagesByConversation, scope);
  saveHistoryLocal(inScope, userId);
  if (isGoogleSheetsWriteConfigured()) {
    void syncHistoryToSheets(inScope, userId);
  }
}

/** Charge les messages visibles selon le périmètre (groupes membres ou admin = tout). */
export async function loadHistory(scope: MessageLoadScope): Promise<PersistedMessage[]> {
  const userId = getCurrentUserIdForSheets();
  if (!userId) return [];

  if (isGoogleSheetsReadConfigured()) {
    try {
      const remote = await loadHistoryFromSheets(scope);
      if (remote.length > 0) {
        const byConv: Record<string, PersistedMessage[]> = {};
        remote.forEach((m) => {
          if (!byConv[m.conversationId]) byConv[m.conversationId] = [];
          byConv[m.conversationId].push(m);
        });
        saveHistoryLocal(byConv, userId);
        return remote;
      }
    } catch (err) {
      console.error("Google Sheets load failed, fallback localStorage:", err);
    }
  }

  return loadHistoryLocal(userId, scope);
}

export async function updateMessageInSheets(
  id: string,
  patch: Partial<Pick<PersistedMessage, "text" | "authorName">>,
): Promise<void> {
  await sheetPut("messages", id, patch);
}

export { isGoogleSheetsReadConfigured, isGoogleSheetsWriteConfigured };
