const LS_DELETED_CONVERSATIONS = "nel_moderation_deleted_conversations";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_DELETED_CONVERSATIONS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && !!id.trim()));
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_DELETED_CONVERSATIONS, JSON.stringify([...ids]));
  } catch {
    /* ignore quota */
  }
}

export function isModerationDeletedConversation(conversationId: string): boolean {
  const id = conversationId.trim();
  if (!id) return false;
  return readSet().has(id);
}

export function addModerationDeletedConversation(conversationId: string): void {
  const id = conversationId.trim();
  if (!id) return;
  const set = readSet();
  if (set.has(id)) return;
  set.add(id);
  writeSet(set);
}

export function filterOutModerationDeletedConversations<T extends { id: string }>(
  conversations: T[],
): T[] {
  return conversations.filter((c) => !isModerationDeletedConversation(c.id));
}
