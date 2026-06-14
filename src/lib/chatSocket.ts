import { io, type Socket } from "socket.io-client";
import type { PersistedMessage } from "./chatPersistence";
import type { AppNotification, ProfileVisit } from "../data/mockData";
import { getAuthToken } from "./authApi";

import { CHAT_API_BASE, isChatApiConfigured } from "./chatConfig";

export { isChatApiConfigured, CHAT_API_BASE };
let socket: Socket | null = null;
let socketToken: string | null = null;

export function connectChatSocket(token: string): Socket | null {
  if (!isChatApiConfigured()) return null;

  if (socket && socketToken !== token) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  if (!socket) {
    socket = io(CHAT_API_BASE, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    socketToken = token;
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function getChatSocket(): Socket | null {
  const token = getAuthToken();
  if (!token || !isChatApiConfigured()) return null;
  return connectChatSocket(token);
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    socketToken = null;
  }
}

export function sendMessageRemote(message: PersistedMessage): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("message:send", {
    conversationId: message.conversationId,
    id: message.id,
    text: message.text,
    sentAt: message.sentAt,
  });
}

export function emitFriendRequestRemote(payload: {
  recipientUserId: string;
  visit: ProfileVisit;
  notification: AppNotification;
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("friend-request:send", {
    recipientUserId: payload.recipientUserId,
    visit: payload.visit,
    notification: payload.notification,
  });
}

export function emitFriendRequestRespondRemote(payload: {
  recipientUserId: string;
  action: "accepted" | "rejected";
  notification: AppNotification;
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("friend-request:respond", {
    recipientUserId: payload.recipientUserId,
    action: payload.action,
    notification: payload.notification,
  });
}

export function emitEventInviteRemote(payload: {
  recipientUserId: string;
  notification: AppNotification;
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("event-invite:send", {
    recipientUserId: payload.recipientUserId,
    notification: payload.notification,
  });
}

export async function checkChatApiHealth(): Promise<boolean> {
  if (!isChatApiConfigured()) return false;
  try {
    const res = await fetch(`${CHAT_API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
