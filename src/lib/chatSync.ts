import type { Conversation, Message } from "../data/mockData";
import type { AppNotification, ProfileVisit } from "../data/mockData";
import type { UserBadgeSeenPayload } from "./userBadges";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { resolveMessageAccessFromStores } from "./accessScope";
import { saveHistory, buildEventDateKeyByConversationId } from "./chatPersistence";
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
} from "./chatSocket";
import { isChatApiConfigured } from "./chatConfig";
import { getAuthToken } from "./authApi";
import {
  findDmConversationByPeer,
  resolveLocalDmConversationId,
} from "./dmConversation";

let listenersAttached = false;
let activeConversationId: string | null = null;
let lastConversationIds: string[] = [];

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

function applyMessages(
  conversationId: string,
  merged: Message[],
  incomingMessage?: Message,
): void {
  const user = useAuthStore.getState().user;
  const isIncomingFromOther =
    incomingMessage != null &&
    !incomingMessage.isOwn &&
    conversationId !== activeConversationId;

  useMessagingStore.setState((s) => {
    const newAppNotifications =
      isIncomingFromOther && incomingMessage
        ? [
            ...(s.appNotifications.some(
              (n) => n.id === `n_chat_${incomingMessage.id}`,
            )
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
        : [...s.appNotifications];

    return {
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
      appNotifications: newAppNotifications,
    };
  });

  saveHistory(
    useMessagingStore.getState().messagesByConversation,
    resolveMessageAccessFromStores(),
    {
      eventDateKeyByConversationId: buildEventDateKeyByConversationId(
        useMessagingStore.getState().events,
      ),
    },
  );
  if (isIncomingFromOther) {
    queueMicrotask(() => useMessagingStore.getState().reconcileUserBadgeCounts());
  }
}

function ensureConversationForIncoming(
  localConversationId: string,
  remoteConversationId: string,
  incomingMessage: Message,
  authorUserId?: string,
): string {
  const state = useMessagingStore.getState();
  if (state.conversations.some((c) => c.id === localConversationId)) {
    return localConversationId;
  }

  const user = useAuthStore.getState().user;
  const peerId = authorUserId?.trim();
  if (
    peerId &&
    user?.id &&
    peerId !== user.id &&
    remoteConversationId.startsWith("dm-")
  ) {
    const createdId = state.openOrCreateDmConversation({
      profilId: peerId,
      displayName: incomingMessage.authorName,
    });
    return (
      resolveLocalDmConversationId(
        remoteConversationId,
        peerId,
        useMessagingStore.getState().conversations,
        user.id,
      ) || createdId
    );
  }

  return localConversationId;
}

function handleIncomingMessage(
  message: {
    id: string;
    conversationId: string;
    authorId?: string;
    authorName: string;
    text: string;
    sentAt: number;
  },
): void {
  const user = useAuthStore.getState().user;
  const viewerName = useMessagingStore.getState().viewerProfileDisplayName;
  const remoteConversationId = message.conversationId;
  const conversations = useMessagingStore.getState().conversations;
  let localConversationId = resolveLocalDmConversationId(
    remoteConversationId,
    message.authorId,
    conversations,
    user?.id,
  );

  const uiMessage = toUiMessage(message, user?.id, viewerName);
  if (!uiMessage.isOwn) {
    localConversationId = ensureConversationForIncoming(
      localConversationId,
      remoteConversationId,
      uiMessage,
      message.authorId,
    );
  }

  const current =
    useMessagingStore.getState().messagesByConversation[localConversationId] ??
    [];
  const alreadyHad = current.some((m) => m.id === message.id);
  const merged = mergeMessages(current, [{ ...uiMessage, conversationId: localConversationId }]);
  applyMessages(
    localConversationId,
    merged,
    alreadyHad ? undefined : { ...uiMessage, conversationId: localConversationId },
  );
}
function applyIncomingFriendRequest(
  visit: ProfileVisit,
  notif: AppNotification,
): void {
  useMessagingStore.setState((s) => {
    const idx = s.profileVisits.findIndex((v) => v.id === visit.id);
    const profileVisits =
      idx >= 0
        ? s.profileVisits.map((v, i) =>
            i === idx ? { ...v, ...visit, friendRequest: true } : v,
          )
        : [visit, ...s.profileVisits];
    const already = s.appNotifications.some((n) => n.id === notif.id);
    const appNotifications = already
      ? s.appNotifications
      : [notif, ...s.appNotifications];
    return { profileVisits, appNotifications };
  });
  queueMicrotask(() => useMessagingStore.getState().reconcileUserBadgeCounts());
  const name = notif.senderName?.trim() || visit.name;
  useMessagingStore.getState().showToast(`Demande d'ami de ${name}`);
}

function applyFriendRequestAccepted(notif: AppNotification): void {
  const accepterId = notif.inviteeProfilId?.trim();
  if (!accepterId) return;
  const accepterName =
    notif.senderName?.trim() || notif.inviteeName?.trim() || "Quelqu'un";

  useMessagingStore.setState((s) => {
    const visit = s.profileVisits.find((v) => v.id === accepterId);
    const sug = s.suggestions.find((x) => x.id === accepterId);
    const existing = s.friends.find((f) => f.profilId === accepterId);
    const label = visit?.name ?? sug?.pseudo ?? existing?.name ?? accepterName;
    const imageUrl =
      visit?.avatarUrl ?? sug?.imageUrl ?? existing?.imageUrl ?? "";
    const age = visit?.age ?? sug?.age ?? existing?.age ?? null;

    let nextFriends = s.friends;
    if (existing) {
      nextFriends = s.friends.map((f) =>
        f.profilId === accepterId ? { ...f, mutualFriend: true } : f,
      );
    } else {
      nextFriends = [
        ...s.friends,
        {
          profilId: accepterId,
          name: label,
          pseudo: label,
          age,
          city: "",
          imageUrl,
          eventsInCommon: 0,
          mainChatConversationId: "",
          mutualFriend: true,
        },
      ];
    }

    const already = s.appNotifications.some((n) => n.id === notif.id);
    return {
      friends: nextFriends,
      friendRequestSentProfilIds: s.friendRequestSentProfilIds.filter(
        (pid) => pid !== accepterId,
      ),
      appNotifications: already
        ? s.appNotifications
        : [notif, ...s.appNotifications],
    };
  });
  useMessagingStore
    .getState()
    .showToast(`${accepterName} a accepté votre demande d'ami.`);
}

function applyFriendRequestRejected(notif: AppNotification): void {
  const rejectorId = notif.inviteeProfilId?.trim();
  if (!rejectorId) return;
  const rejectorName =
    notif.senderName?.trim() || notif.inviteeName?.trim() || "Quelqu'un";

  useMessagingStore.setState((s) => {
    const already = s.appNotifications.some((n) => n.id === notif.id);
    const rejected = s.friendRequestRejectedProfilIds.includes(rejectorId)
      ? s.friendRequestRejectedProfilIds
      : [...s.friendRequestRejectedProfilIds, rejectorId];
    return {
      friendRequestSentProfilIds: s.friendRequestSentProfilIds.filter(
        (pid) => pid !== rejectorId,
      ),
      friendRequestRejectedProfilIds: rejected,
      appNotifications: already
        ? s.appNotifications
        : [notif, ...s.appNotifications],
    };
  });
  useMessagingStore
    .getState()
    .showToast(`${rejectorName} a refusé votre demande d'ami.`);
}

function applyEventInvite(notif: AppNotification): void {
  useMessagingStore.setState((s) => {
    const already = s.appNotifications.some((n) => n.id === notif.id);
    const appNotifications = already
      ? s.appNotifications
      : [notif, ...s.appNotifications];
    const eventId = notif.eventId?.trim();
    const viewerId = useAuthStore.getState().user?.id?.trim();
    const events =
      eventId && viewerId
        ? s.events.map((e) => {
            if (e.id !== eventId) return e;
            const invited = new Set(e.invitedProfilIds ?? []);
            invited.add(viewerId);
            return { ...e, invitedProfilIds: [...invited] };
          })
        : s.events;
    return { appNotifications, events };
  });
  queueMicrotask(() => useMessagingStore.getState().reconcileUserBadgeCounts());
  const host = notif.senderName?.trim() || "Quelqu'un";
  const title = notif.eventTitle?.trim() || "un évènement";
  useMessagingStore.getState().showToast(`${host} vous invite à « ${title} ».`);
}

function ensureSocketListeners(): void {
  const socket = getChatSocket();
  if (!socket || listenersAttached) return;

  listenersAttached = true;

  const emitUserSync = () => {
    if (lastConversationIds.length > 0) {
      socket.emit("user:sync", { conversationIds: lastConversationIds });
    }
  };

  if (socket.connected) {
    emitUserSync();
  }

  socket.on("connect", emitUserSync);

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
      const current =
        useMessagingStore.getState().messagesByConversation[conversationId] ??
        [];
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
      handleIncomingMessage(message);
    },
  );

  socket.on("chat:error", (payload: { error?: string }) => {
    console.error("Chat socket error:", payload?.error ?? "unknown");
  });

  socket.on(
    "friend-request:new",
    (payload: { visit?: ProfileVisit; notification?: AppNotification }) => {
      const visit = payload?.visit;
      const notification = payload?.notification;
      if (!visit?.id || !notification?.id) return;
      if (notification.kind !== "friend_request_received") return;
      applyIncomingFriendRequest(
        { ...visit, friendRequest: true },
        notification,
      );
    },
  );

  socket.on(
    "friend-request:accepted",
    (payload: { notification?: AppNotification }) => {
      const notification = payload?.notification;
      if (!notification?.id || notification.kind !== "friend_request_accepted")
        return;
      applyFriendRequestAccepted(notification);
    },
  );

  socket.on(
    "friend-request:rejected",
    (payload: { notification?: AppNotification }) => {
      const notification = payload?.notification;
      if (!notification?.id || notification.kind !== "friend_request_rejected")
        return;
      applyFriendRequestRejected(notification);
    },
  );

  socket.on(
    "event-invite:new",
    (payload: { notification?: AppNotification }) => {
      const notification = payload?.notification;
      if (!notification?.id || notification.kind !== "event_invite_received")
        return;
      applyEventInvite(notification);
    },
  );

  socket.on(
    "waitlist:accepted",
    (payload: { eventId?: string; eventTitle?: string; organizerName?: string }) => {
      const eventId = payload?.eventId?.trim();
      const eventTitle = payload?.eventTitle?.trim() || "un événement";
      const organizerName = payload?.organizerName?.trim() || "L'organisateur";
      if (!eventId) return;

      // Met à jour l'événement dans le store
      const store = useMessagingStore.getState();
      const event = store.events.find((e) => e.id === eventId);
      if (event) {
        const updatedEvent = {
          ...event,
          status: "inscrit" as const,
          participantCount: Math.min(event.participantMax, event.participantCount + 1),
        };
        // Mise à jour locale du statut
        useMessagingStore.setState((s) => ({
          events: s.events.map((e) => (e.id === eventId ? updatedEvent : e)),
        }));
      }

      useMessagingStore.getState().showToast(
        `Tu as été accepté(e) pour « ${eventTitle} ».`
      );
    },
  );

  socket.on(
    "waitlist:rejected",
    (payload: { eventId?: string; eventTitle?: string; organizerName?: string }) => {
      const eventTitle = payload?.eventTitle?.trim() || "un événement";

      useMessagingStore.getState().showToast(
        `Tu n'as pas été accepté(e) pour « ${eventTitle} ».`
      );
    },
  );

  socket.on(
    "group:you-added",
    (payload: {
      conversationId: string;
      addedByUserId: string;
      addedByName: string;
      conversation: { id: string; title: string };
    }) => {
      const conversationId = payload?.conversationId?.trim();
      const addedByName = payload?.addedByName?.trim() || "Quelqu'un";
      if (!conversationId) return;

      // Ajoute la conversation dans le store si elle n'existe pas
      const store = useMessagingStore.getState();
      const exists = store.conversations.some((c) => c.id === conversationId);
      if (!exists) {
        const title = payload.conversation?.title || "Groupe";
        const newConv: Conversation = {
          id: conversationId,
          title,
          type: "group",
          lastMessagePreview: "",
          avatarGradient: ["#9B5DE5", "#C23B8E"],
          unreadCount: 0,
          updatedAt: Date.now(),
          isFavorite: false,
          memberCount: 1,
          members: [
            {
              id: "me",
              name: "Moi",
              isSelf: true,
              avatarGradient: ["#78909C", "#546E7A"],
            },
          ],
        };
        useMessagingStore.setState((s) => ({
          conversations: [newConv, ...s.conversations],
        }));
      }

      // Toast de notification
      useMessagingStore.getState().showToast(`${addedByName} vous a ajouté au groupe.`);
    },
  );

  socket.on("badge:seen", (payload: UserBadgeSeenPayload) => {
    if (!payload?.key || typeof payload.updatedAt !== "number") return;
    useMessagingStore.getState().applyRemoteUserBadgeSeen(payload);
  });
}

export function setActiveChatConversationId(
  conversationId: string | null,
): void {
  activeConversationId = conversationId;
}

export { getChatSocket } from "./chatSocket";

export function initGlobalChatSync(conversationIds: string[]): void {
  if (!isChatApiConfigured()) return;

  const token = getAuthToken();
  if (!token) return;

  lastConversationIds = conversationIds;
  connectChatSocket(token);
  ensureSocketListeners();

  const socket = getChatSocket();
  if (socket && lastConversationIds.length > 0) {
    const sync = () => {
      socket.emit("user:sync", { conversationIds: lastConversationIds });
    };
    if (socket.connected) sync();
    else socket.once("connect", sync);
  }
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
