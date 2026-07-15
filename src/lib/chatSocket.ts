import { io, type Socket } from "socket.io-client";
import type { PersistedMessage } from "./chatPersistence";
import type { AppNotification, ProfileVisit } from "../data/mockData";
import type { UserBadgeSeenPayload } from "./userBadges";
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
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketToken = token;

    socket.on("disconnect", (reason) => {
      console.debug("Chat socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.debug("Chat socket connect error:", err.message);
    });
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

export function sendMessageRemote(
  message: PersistedMessage & { recipientUserIds?: string[] },
): void {
  const s = getChatSocket();
  if (!s) return;

  const payload = {
    conversationId: message.conversationId,
    id: message.id,
    text: message.text,
    sentAt: message.sentAt,
    recipientUserIds: message.recipientUserIds,
  };

  const emit = () => {
    s.emit("message:send", payload);
  };

  if (s.connected) {
    emit();
  } else {
    s.once("connect", emit);
  }
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

export function emitFriendRemovedRemote(payload: {
  recipientUserId: string;
  removerUserId: string;
  removerName: string;
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("friend:remove", {
    recipientUserId: payload.recipientUserId,
    removerUserId: payload.removerUserId,
    removerName: payload.removerName,
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

export function emitWaitlistRespondRemote(payload: {
  recipientUserId: string;
  action: "accepted" | "rejected";
  eventId: string;
  eventTitle: string;
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("waitlist:respond", {
    recipientUserId: payload.recipientUserId,
    action: payload.action,
    eventId: payload.eventId,
    eventTitle: payload.eventTitle,
  });
}

export function emitGroupMemberAddedRemote(payload: {
  conversationId: string;
  targetUserId: string;
  conversation: { id: string; title: string };
}): void {
  const s = getChatSocket();
  if (!s) return;

  s.emit("group:member-added", {
    conversationId: payload.conversationId,
    targetUserId: payload.targetUserId,
    conversation: payload.conversation,
  });
}

export function emitUserBadgeSeenRemote(payload: UserBadgeSeenPayload): void {
  const s = getChatSocket();
  if (!s) return;

  const emit = () => {
    s.emit("badge:seen", payload);
  };

  if (s.connected) {
    emit();
  } else {
    s.once("connect", emit);
  }
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
