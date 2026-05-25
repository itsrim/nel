import type { Message } from "../data/mockData";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { saveHistory } from "./chatPersistence";
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  isChatApiConfigured,
} from "./chatSocket";
import { getAuthToken } from "./authApi";

let listenersAttached = false;
let activeConversationId: string | null = null;

function toUiMessage(
  raw: {
    id: string;
    conversationId: string;
    authorId?: string;
    authorName: string;
    text: string;
    sentAt: number;
  },
  viewerId: string | undefined,
  viewerName: string,
): Message {
  const isOwn = raw.authorId
    ? raw.authorId === viewerId
    : raw.authorName === viewerName;
  return {
    id: raw.id,
    conversationId: raw.conversationId,
    authorName: raw.authorName,
    text: raw.text,
    sentAt: raw.sentAt,
    isOwn,
  };
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

function applyMessages(conversationId: string, merged: Message[], incomingMessage?: Message): void {
  const user = useAuthStore.getState().user;
  const isIncomingFromOther =
    incomingMessage != null &&
  !incomingMessage.isOwn &&
    conversationId !== activeConversationId;

  useMessagingStore.setState((s) => ({
    messagesByConversation: {
      ...s.messagesByConversation,
      [conversationId]: merged,
    },
    conversations: s.conversations.map((c) => {
      if (c.id !== conversationId) return c;
      const last = merged[merged.length - 1];
      return {
        ...c,
        lastMessagePreview: last?.text.slice(0, 72) ?? c.lastMessagePreview,
        updatedAt: last?.sentAt ?? c.updatedAt,
        unreadCount: isIncomingFromOther ? c.unreadCount + 1 : c.unreadCount,
      };
    }),
    appNotifications: isIncomingFromOther && incomingMessage
      ? [
          ...(s.appNotifications.some((n) => n.id === `n_chat_${incomingMessage.id}`)
            ? []
            : [
                {
                  id: `n_chat_${incomingMessage.id}`,
                  createdAt: incomingMessage.sentAt,
                  kind: "chat_message" as const,
                  conversationId,
                  senderName: incomingMessage.authorName,
                  messagePreview: incomingMessage.text.slice(0, 120),
                },
              ]),
          ...s.appNotifications,
        ]
      : s.appNotifications,
  }));

  saveHistory(useMessagingStore.getState().messagesByConversation);
}

function ensureSocketListeners(): void {
  const socket = getChatSocket();
  if (!socket || listenersAttached) return;

  listenersAttached = true;

  socket.on(
    "message:history",
    (payload: {
      conversationId: string;
      messages: Array<{
        id: string;
        conversationId: string;
        authorId?: string;
        authorName: string;
        text: string;
        sentAt: number;
      }>;
    }) => {
      const conversationId = payload?.conversationId?.trim();
      if (!conversationId || !Array.isArray(payload.messages)) return;

      const user = useAuthStore.getState().user;
      const viewerName = useMessagingStore.getState().viewerProfileDisplayName;
      const current = useMessagingStore.getState().messagesByConversation[conversationId] ?? [];
      const incoming = payload.messages.map((m) =>
        toUiMessage(m, user?.id, viewerName),
      );
      applyMessages(conversationId, mergeMessages(current, incoming));
    },
  );

  socket.on(
    "message:new",
    (payload: {
      message: {
        id: string;
        conversationId: string;
        authorId?: string;
        authorName: string;
        text: string;
        sentAt: number;
      };
    }) => {
      const message = payload?.message;
      if (!message?.conversationId) return;

      const user = useAuthStore.getState().user;
      const viewerName = useMessagingStore.getState().viewerProfileDisplayName;
      const conversationId = message.conversationId;
      const current = useMessagingStore.getState().messagesByConversation[conversationId] ?? [];
      const alreadyHad = current.some((m) => m.id === message.id);
      const uiMessage = toUiMessage(message, user?.id, viewerName);
      applyMessages(
        conversationId,
        mergeMessages(current, [uiMessage]),
        alreadyHad ? undefined : uiMessage,
      );
    },
  );

  socket.on("chat:error", (payload: { error?: string }) => {
    console.error("Chat socket error:", payload?.error ?? "unknown");
  });

  socket.on("connect", () => {
    const ids = useMessagingStore.getState().conversations.map((c) => c.id);
    socket.emit("user:sync", { conversationIds: ids });
  });
}

export function setActiveChatConversationId(conversationId: string | null): void {
  activeConversationId = conversationId;
}

export function initGlobalChatSync(conversationIds: string[]): void {
  if (!isChatApiConfigured()) return;

  const token = getAuthToken();
  if (!token) return;

  connectChatSocket(token);
  ensureSocketListeners();

  const socket = getChatSocket();
  if (!socket) return;

  socket.emit("user:sync", { conversationIds });
}

export function shutdownGlobalChatSync(): void {
  listenersAttached = false;
  activeConversationId = null;
  disconnectChatSocket();
}

/** Compatibilité ChatRoomPage */
export function startConversationSocket(_conversationId: string): void {
  /* géré globalement par initGlobalChatSync */
}

export function stopConversationSocket(_conversationId: string): void {
  /* géré globalement */
}

export function stopAllConversationSockets(): void {
  shutdownGlobalChatSync();
}

export const startConversationPolling = startConversationSocket;
export const stopConversationPolling = stopConversationSocket;
export const stopAllConversationPolling = stopAllConversationSockets;
