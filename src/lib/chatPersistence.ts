/**
 * Simple CSV persistence for chat messages.
 * Stores messages in localStorage as a CSV string.
 * Retention policy: 7 days.
 */

export interface PersistedMessage {
  conversationId: string;
  id: string;
  authorId?: string;
  authorName: string;
  text: string;
  sentAt: number;
}

const STORAGE_KEY = "nel_chat_history_csv";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Escapes a string for CSV (wraps in quotes, doubles existing quotes).
 */
function escapeCSV(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes messages to a CSV string.
 * Format: conversationId,id,authorName,text,sentAt
 */
export function serializeMessagesToCSV(messagesByConversation: Record<string, any[]>): string {
  const now = Date.now();
  const rows: string[] = ["conversationId,id,authorName,text,sentAt"];

  Object.entries(messagesByConversation).forEach(([convId, messages]) => {
    messages.forEach((m) => {
      // Retention check
      if (now - m.sentAt > RETENTION_MS) return;

      const row = [
        escapeCSV(convId),
        escapeCSV(m.id),
        escapeCSV(m.authorName),
        escapeCSV(m.text),
        String(m.sentAt),
      ].join(",");
      rows.push(row);
    });
  });

  return rows.join("\n");
}

/**
 * Parses a CSV string back into message objects.
 */
export function deserializeCSVToMessages(csv: string): PersistedMessage[] {
  if (!csv || !csv.trim()) return [];

  const lines = csv.split(/\r?\n/);
  if (lines.length <= 1) return []; // Only header or empty

  const messages: PersistedMessage[] = [];
  const now = Date.now();

  // Basic CSV parser that handles quoted strings
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
          // Double quote inside quotes
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

    if (parts.length >= 5) {
      const sentAt = parseInt(parts[4], 10);
      // Final retention check on load
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

/**
 * Saves the current message state to localStorage as CSV.
 */
export function saveHistory(messagesByConversation: Record<string, any[]>): void {
  try {
    const csv = serializeMessagesToCSV(messagesByConversation);
    localStorage.setItem(STORAGE_KEY, csv);
  } catch (err) {
    console.error("Failed to save chat history to CSV:", err);
  }
}

/**
 * Loads the message history from localStorage.
 */
export function loadHistory(): PersistedMessage[] {
  try {
    const csv = localStorage.getItem(STORAGE_KEY);
    if (!csv) return [];
    return deserializeCSVToMessages(csv);
  } catch (err) {
    console.error("Failed to load chat history from CSV:", err);
    return [];
  }
}
