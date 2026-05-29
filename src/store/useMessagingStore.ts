import { create } from "zustand";
import {
  MOCK_EVENTS,
  MOCK_CONVERSATIONS,
  MOCK_VISITS,
  MOCK_SUGGESTIONS,
  MOCK_FRIENDS,
  MOCK_MESSAGES,
  type Event,
  type Conversation,
  type ProfileVisit,
  type SuggestionProfile,
  type Friend,
  type Message,
  type GroupMember,
  type AppNotification,
  type AdminReportEntry,
} from "../data/mockData";
import { isChatApiConfigured } from "../lib/chatConfig";
import { sendMessageRemote } from "../lib/chatSocket";
import { loadHistory, saveHistory, type PersistedMessage } from "../lib/chatPersistence";
import { useAuthStore } from "./useAuthStore";
import {
  syncAllViewerStateFromStore,
  syncConversationDeleteToSheets,
  syncConversationToSheets,
  syncEventDeleteToSheets,
  syncEventToSheets,
  syncFriendToSheets,
  syncNotificationToSheets,
  syncReportDeleteToSheets,
  syncReportToSheets,
} from "../lib/appSheetPersistence";

export interface EventReminder {
  id: string;
  eventId: string;
  eventTitle: string;
  participantId: string;
  participantName: string;
  sentAt: number;
  readAt?: number;
}


const LS_VIEWER_AVATAR = "nel_viewer_profile_avatar_url";
const LS_VIEWER_NAME = "nel_viewer_profile_display_name";
const LS_VIEWER_IS_PRO = "nel_viewer_profile_is_pro";
const LS_VIEWER_CITY = "nel_viewer_profile_city";
const LS_VIEWER_PRO_WEBSITE = "nel_viewer_pro_website_url";
const LS_VIEWER_PRO_SOCIAL = "nel_viewer_pro_social_url";
const LS_VIEWER_PRO_PHONE = "nel_viewer_pro_phone";
const DEFAULT_VIEWER_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800";
const DEFAULT_VIEWER_NAME = "Jean J.";

function readViewerStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v != null && v.trim() !== "" ? v.trim() : fallback;
  } catch {
    return fallback;
  }
}

export type NewEventInput = {
  conversationId: string;
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  timeShort?: string;
  priceLabel?: string;
  imageUri?: string;
  participantMax?: number;
  dateKey: string;
  sectionDateLabel: string;
  hideAddress?: boolean;
  isPrivate?: boolean;
  manualApproval?: boolean;
  isBeta?: boolean;
};

/** Mise à jour d’une sortie existante (même conversation / même id). */
export type UpdateEventInput = {
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  timeShort?: string;
  imageUri?: string;
  participantMax: number;
  dateKey: string;
  sectionDateLabel: string;
  hideAddress?: boolean;
  isPrivate?: boolean;
  manualApproval?: boolean;
  isBeta?: boolean;
};

function pushMessageRemote(message: PersistedMessage) {
  if (!isChatApiConfigured()) return;
  sendMessageRemote(message);
}

function persistLocalMessages(messagesByConversation: Record<string, Message[]>) {
  saveHistory(messagesByConversation);
}

function syncViewerSettingsFromState(state: MessagingState) {
  let email: string | undefined;
  let emailVerified: boolean | undefined;
  try {
    const raw = localStorage.getItem("nel_auth_user");
    if (raw) {
      const auth = JSON.parse(raw) as { email?: string; emailVerified?: boolean };
      email = auth.email;
      emailVerified = auth.emailVerified;
    }
  } catch {
    /* ignore */
  }
  syncAllViewerStateFromStore({
    email,
    emailVerified,
    viewerProfileAvatarUrl: state.viewerProfileAvatarUrl,
    viewerProfileDisplayName: state.viewerProfileDisplayName,
    viewerProfileIsPro: state.viewerProfileIsPro,
    viewerProfileCity: state.viewerProfileCity,
    viewerProWebsiteUrl: state.viewerProWebsiteUrl,
    viewerProSocialUrl: state.viewerProSocialUrl,
    viewerProPhone: state.viewerProPhone,
    friendRequestSentProfilIds: state.friendRequestSentProfilIds,
    friendRequestRejectedProfilIds: state.friendRequestRejectedProfilIds,
    favoriteConversationIds: state.favoriteConversationIds,
    moderationHiddenEventIds: state.moderationHiddenEventIds,
    moderationHiddenProfilIds: state.moderationHiddenProfilIds,
  });
}

interface MessagingState {
  /** Synchronisé avec l’interrupteur « Mode admin » du profil (aperçu nel). */
  nelDemoIsAdmin: boolean;
  setNelDemoIsAdmin: (value: boolean) => void;
  /** Synchronisé avec l’interrupteur « Premium » du profil (aperçu nel). */
  nelDemoIsPremium: boolean;
  setNelDemoIsPremium: (value: boolean) => void;
  /** Photo de profil (hero) — même source que l’onglet Profil, persistée. */
  viewerProfileAvatarUrl: string;
  setViewerProfileAvatarUrl: (url: string) => void;
  /** Prénom / pseudo affiché (hero, hôte, tuile « moi »). */
  viewerProfileDisplayName: string;
  setViewerProfileDisplayName: (name: string) => void;
  /** Compte professionnel (coche professionnel dans les préférences) */
  viewerProfileIsPro: boolean;
  setViewerProfileIsPro: (value: boolean) => void;
  viewerProfileCity: string;
  setViewerProfileCity: (city: string) => void;
  viewerProWebsiteUrl: string;
  setViewerProWebsiteUrl: (url: string) => void;
  viewerProSocialUrl: string;
  setViewerProSocialUrl: (url: string) => void;
  viewerProPhone: string;
  setViewerProPhone: (phone: string) => void;
  events: Event[];
  conversations: Conversation[];
  profileVisits: ProfileVisit[];
  suggestions: SuggestionProfile[];
  friends: Friend[];
  /** Profils (`profilId`) à qui une demande d’ami a déjà été envoyée (démo — irréversible). */
  friendRequestSentProfilIds: string[];
  /** Demande refusée par l’autre (démo — ne pas renvoyer). */
  friendRequestRejectedProfilIds: string[];
  /** Envoie une demande d’ami si pas déjà ami, pas refusée et pas déjà envoyée. */
  sendFriendRequest: (profilId: string) => void;
  /** Démo : plus d’ami mutuel — masque Message / retire l’accès DM privé côté UI. */
  removeMutualFriend: (profilId: string) => void;
  /** Fil Profil → Notifications (invitations sorties, etc.). */
  appNotifications: AppNotification[];
  /** File admin : signalements profils / sorties (onglet Signalements). */
  adminReports: AdminReportEntry[];
  submitAdminReport: (input: {
    kind: "profile" | "event";
    subjectId: string;
    subjectLabel: string;
    explanation: string;
  }) => void;
  /** Marque tous les signalements comme lus (ouverture de l’onglet admin). */
  markAllAdminReportsRead: () => void;
  /** Sorties retirées de l’agenda public après action modération (démo). */
  moderationHiddenEventIds: string[];
  /** Profils retirés des suggestions / visites après action modération (démo). */
  moderationHiddenProfilIds: string[];
  dismissAdminReport: (reportId: string) => void;
  /** Retire le signalement, masque le contenu et envoie un message dans le fil groupe ou DM si possible. */
  moderationHideAndNotifyFromReport: (reportId: string) => void;
  /** Message « Modération Nel » dans un fil (non écrit par « Moi »). */
  postModerationNotice: (conversationId: string, text: string) => void;
  favoriteConversationIds: string[];
  messagesByConversation: Record<string, Message[]>;
  toggleEventFavorite: (eventId: string) => void;
  toggleConversationFavorite: (conversationId: string) => void;
  getEventById: (id: string) => Event | undefined;
  getEventByConversationId: (conversationId: string) => Event | undefined;
  sendMessage: (conversationId: string, text: string) => void;
  /** Crée ou réutilise un fil DM avec un profil (ami, pro, etc.). */
  openOrCreateDmConversation: (params: {
    profilId: string;
    displayName: string;
    avatarUrl?: string;
    avatarGradient?: readonly [string, string];
  }) => string;
  markAsRead: (conversationId: string) => void;
  /** Enregistre l’ouverture du fil (bande favoris triée « dernier ouvert »). */
  recordConversationOpened: (conversationId: string) => void;
  addEvent: (input: NewEventInput) => string;
  updateEvent: (eventId: string, input: UpdateEventInput) => void;
  cancelEvent: (eventId: string) => void;
  createEmptyGroup: (title: string) => string;
  postEventGroupWelcome: (conversationId: string, eventTitle: string) => void;
  addMemberToGroup: (conversationId: string, member: GroupMember) => void;
  removeMemberFromGroup: (conversationId: string, memberId: string) => void;
  leaveConversation: (conversationId: string) => void;
  updateConversationSettings: (
    conversationId: string,
    settings: { muteSounds?: boolean; blockNotifications?: boolean },
  ) => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
  /** Organisateur : invite un ami (notif in-app + message système dans le chat de la sortie). */
  inviteFriendToEvent: (eventId: string, friend: Friend) => void;
  /** Toast global (invitation, etc.). */
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
  /** Load demo data for demo account (user_demo_001) */
  loadDemoData: () => void;
  /** Reset data to empty state (for new users) */
  resetData: () => void;
  eventReminders: EventReminder[];
  sendEventReminder: (eventId: string, participantId: string, participantName: string) => void;
  markEventReminderAsRead: (reminderId: string) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  nelDemoIsAdmin: true,
  setNelDemoIsAdmin: (value) => set({ nelDemoIsAdmin: value }),
  nelDemoIsPremium: true,
  setNelDemoIsPremium: (value) => set({ nelDemoIsPremium: value }),

  viewerProfileAvatarUrl: readViewerStorage(
    LS_VIEWER_AVATAR,
    DEFAULT_VIEWER_AVATAR,
  ),
  setViewerProfileAvatarUrl: (url) => {
    try {
      localStorage.setItem(LS_VIEWER_AVATAR, url);
    } catch {
      /* ignore */
    }
    set({ viewerProfileAvatarUrl: url });
    syncViewerSettingsFromState(get());
  },

  viewerProfileDisplayName: readViewerStorage(
    LS_VIEWER_NAME,
    DEFAULT_VIEWER_NAME,
  ),
  setViewerProfileDisplayName: (name) => {
    const n = name.trim() || DEFAULT_VIEWER_NAME;
    try {
      localStorage.setItem(LS_VIEWER_NAME, n);
    } catch {
      /* ignore */
    }
    set({ viewerProfileDisplayName: n });
    syncViewerSettingsFromState(get());
  },

  viewerProfileIsPro: typeof window !== "undefined" ? localStorage.getItem(LS_VIEWER_IS_PRO) === "true" : false,
  setViewerProfileIsPro: (value) => {
    try {
      localStorage.setItem(LS_VIEWER_IS_PRO, String(value));
    } catch {
      /* ignore */
    }
    set({ viewerProfileIsPro: value });
    syncViewerSettingsFromState(get());
  },

  viewerProfileCity: readViewerStorage(LS_VIEWER_CITY, ""),
  setViewerProfileCity: (city) => {
    const v = city.trim();
    try {
      localStorage.setItem(LS_VIEWER_CITY, v);
    } catch {
      /* ignore */
    }
    set({ viewerProfileCity: v });
    syncViewerSettingsFromState(get());
  },

  viewerProWebsiteUrl: readViewerStorage(LS_VIEWER_PRO_WEBSITE, ""),
  setViewerProWebsiteUrl: (url) => {
    const v = url.trim();
    try {
      localStorage.setItem(LS_VIEWER_PRO_WEBSITE, v);
    } catch {
      /* ignore */
    }
    set({ viewerProWebsiteUrl: v });
    syncViewerSettingsFromState(get());
  },

  viewerProSocialUrl: readViewerStorage(LS_VIEWER_PRO_SOCIAL, ""),
  setViewerProSocialUrl: (url) => {
    const v = url.trim();
    try {
      localStorage.setItem(LS_VIEWER_PRO_SOCIAL, v);
    } catch {
      /* ignore */
    }
    set({ viewerProSocialUrl: v });
    syncViewerSettingsFromState(get());
  },

  viewerProPhone: readViewerStorage(LS_VIEWER_PRO_PHONE, ""),
  setViewerProPhone: (phone) => {
    const v = phone.trim();
    try {
      localStorage.setItem(LS_VIEWER_PRO_PHONE, v);
    } catch {
      /* ignore */
    }
    set({ viewerProPhone: v });
    syncViewerSettingsFromState(get());
  },

  events: MOCK_EVENTS,
  conversations: [],
  profileVisits: MOCK_VISITS,
  suggestions: MOCK_SUGGESTIONS,
  friends: MOCK_FRIENDS,
  friendRequestSentProfilIds: [],
  /** Quelques refus simulés pour l’aperçu (cœur brisé dans Suggestions). */
  friendRequestRejectedProfilIds: ["u050", "u051", "u052"],
  sendFriendRequest: (profilId) => {
    const id = profilId.trim();
    if (!id) return;
    const {
      friends,
      friendRequestSentProfilIds,
      friendRequestRejectedProfilIds,
    } = get();
    if (friends.find((f) => f.profilId === id)?.mutualFriend === true) return;
    if (friendRequestRejectedProfilIds.includes(id)) return;
    if (friendRequestSentProfilIds.includes(id)) {
      return;
    }
    set({ friendRequestSentProfilIds: [...friendRequestSentProfilIds, id] });
    syncViewerSettingsFromState(get());
    get().showToast("Demande d’ami envoyée.");
  },
  removeMutualFriend: (profilId) => {
    const id = profilId.trim();
    if (!id) return;
    set((state) => ({
      friends: state.friends.map((f) =>
        f.profilId === id && f.mutualFriend === true
          ? { ...f, mutualFriend: false }
          : f,
      ),
    }));
    const updated = get().friends.find((f) => f.profilId === id);
    if (updated) syncFriendToSheets(updated);
    get().showToast("Retiré de vos amis.");
  },
  appNotifications: [],
  adminReports: [],
  submitAdminReport: ({ kind, subjectId, subjectLabel, explanation }) => {
    const id = `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: AdminReportEntry = {
      id,
      createdAt: Date.now(),
      kind,
      subjectId: subjectId.trim(),
      subjectLabel:
        subjectLabel.trim() || (kind === "profile" ? "Profil" : "Sortie"),
      explanation: explanation.trim(),
      read: false,
    };
    set((s) => ({ adminReports: [entry, ...s.adminReports] }));
    syncReportToSheets(entry);
    get().showToast("Signalement envoyé. Merci.");
  },
  markAllAdminReportsRead: () =>
    set((s) => {
      const adminReports = s.adminReports.map((r) =>
        r.read ? r : { ...r, read: true },
      );
      adminReports.forEach((r) => syncReportToSheets(r));
      return { adminReports };
    }),
  moderationHiddenEventIds: [],
  moderationHiddenProfilIds: [],
  dismissAdminReport: (reportId) => {
    const id = reportId.trim();
    if (!id) return;
    syncReportDeleteToSheets(id);
    set((s) => ({ adminReports: s.adminReports.filter((r) => r.id !== id) }));
  },
  postModerationNotice: (conversationId, text) => {
    const tid = conversationId.trim();
    if (!tid) return;
    const body = text.trim();
    if (!body) return;
    const newMessage: Message = {
      id: `mod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: tid,
      authorName: "Modération Nel",
      text: body,
      sentAt: Date.now(),
      isOwn: false,
    };
    set((state) => {
      const currentMessages = state.messagesByConversation[tid] ?? [];
      const next = {
        ...state.messagesByConversation,
        [tid]: [...currentMessages, newMessage],
      };
      persistLocalMessages(next);
      return {
        messagesByConversation: next,
        conversations: state.conversations.map((c) =>
          c.id === tid
            ? {
                ...c,
                lastMessagePreview: body.slice(0, 72),
                updatedAt: Date.now(),
              }
            : c,
        ),
      };
    });
    const conv = get().conversations.find((c) => c.id === tid);
    if (conv) syncConversationToSheets(conv);
    pushMessageRemote(newMessage);
  },
  moderationHideAndNotifyFromReport: (reportId) => {
    const id = reportId.trim();
    if (!id) return;
    const report = get().adminReports.find((r) => r.id === id);
    if (!report) return;

    const notice =
      "Suite à un signalement, l’équipe vous informe qu’un problème a été remonté sur ce contenu. Merci de respecter les règles de la communauté Nel.";

    if (report.kind === "event") {
      const ev = get().events.find((e) => e.id === report.subjectId);
      set((s) => ({
        adminReports: s.adminReports.filter((r) => r.id !== id),
        moderationHiddenEventIds: s.moderationHiddenEventIds.includes(
          report.subjectId,
        )
          ? s.moderationHiddenEventIds
          : [...s.moderationHiddenEventIds, report.subjectId],
      }));
      syncReportDeleteToSheets(id);
      if (ev) {
        get().postModerationNotice(ev.conversationId, notice);
        syncEventDeleteToSheets(ev.id);
        syncConversationDeleteToSheets(ev.conversationId);
        syncViewerSettingsFromState(get());
        get().showToast(
          `Sortie retirée de l’agenda public. Un message a été envoyé dans le fil du groupe « ${ev.title} ».`,
        );
      } else {
        get().showToast("Sortie retirée de l’agenda public.");
      }
      return;
    }

    const f = get().friends.find((fr) => fr.profilId === report.subjectId);
    set((s) => ({
      adminReports: s.adminReports.filter((r) => r.id !== id),
      moderationHiddenProfilIds: s.moderationHiddenProfilIds.includes(
        report.subjectId,
      )
        ? s.moderationHiddenProfilIds
        : [...s.moderationHiddenProfilIds, report.subjectId],
    }));
    syncReportDeleteToSheets(id);
    if (f?.mainChatConversationId) {
      get().postModerationNotice(f.mainChatConversationId, notice);
      syncViewerSettingsFromState(get());
      get().showToast(
        `Profil retiré des suggestions. Message envoyé à ${report.subjectLabel}.`,
      );
    } else {
      get().showToast(
        `Profil retiré des suggestions. Aucun fil privé avec ${report.subjectLabel} pour un message automatique (démo).`,
      );
    }
  },
  favoriteConversationIds: MOCK_CONVERSATIONS.filter((c) => c.isFavorite).map(
    (c) => c.id,
  ),
  messagesByConversation: MOCK_MESSAGES,

  toast: null,
  showToast: (message) => {
    const text = message.trim();
    if (!text) return;
    const toastId = Date.now();
    set({ toast: { id: toastId, message: text } });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        set((s) => (s.toast?.id === toastId ? { toast: null } : {}));
      }, 3200);
    }
  },

  toggleEventFavorite: (eventId) =>
    set((state) => {
      const events = state.events.map((e) =>
        e.id === eventId ? { ...e, isFavorite: !e.isFavorite } : e,
      );
      const ev = events.find((e) => e.id === eventId);
      if (ev) syncEventToSheets(ev);
      return { events };
    }),

  createEmptyGroup: (title) => {
    const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const conv: Conversation = {
      id,
      title,
      type: "group",
      lastMessagePreview: "",
      avatarGradient: ["#9B5DE5", "#C23B8E"] as const,
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
    set((state) => ({
      conversations: [conv, ...state.conversations],
      messagesByConversation: {
        ...state.messagesByConversation,
        [id]: [],
      },
    }));
    syncConversationToSheets(conv);
    return id;
  },

  addEvent: (input) => {
    const id = `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const priceLabel = input.priceLabel?.trim() || "Gratuit";
    const { viewerProfileDisplayName: vn, viewerProfileAvatarUrl: va } = get();
    const hostName = vn.trim() || "Moi";
    const event: Event = {
      id,
      conversationId: input.conversationId,
      title: input.title,
      dateLabel: input.dateLabel,
      sectionDateLabel: input.sectionDateLabel,
      dateKey: input.dateKey,
      timeShort: input.timeShort?.trim() || "10:00",
      location: input.location,
      notes: input.notes,
      imageUri:
        input.imageUri?.trim() ||
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
      priceLabel,
      price: priceLabel,
      participantCount: 1,
      participantMax: Math.max(2, input.participantMax ?? 50),
      isFavorite: false,
      isBeta: input.isBeta === true,
      status: "organisateur",
      visitsCount: 0,
      category: "Sortie",
      hostName,
      hostAvatar: va,
      hostedByViewer: true,
      creatorId: hostName,
      hideAddress: input.hideAddress,
      isPrivate: input.isPrivate === true,
      manualApproval: input.manualApproval,
      invitedProfilIds: [],
    };
    set((state) => ({ events: [event, ...state.events] }));
    syncEventToSheets(event);
    return id;
  },

  updateEvent: (eventId, input) => {
    set((state) => {
      const ev = state.events.find((e) => e.id === eventId);
      if (!ev) return state;
      const cappedMax = Math.min(Math.max(2, input.participantMax), 150);
      const participantMax = Math.max(cappedMax, ev.participantCount);
      const next: Event = {
        ...ev,
        title: input.title.trim(),
        dateLabel: input.dateLabel,
        sectionDateLabel: input.sectionDateLabel,
        dateKey: input.dateKey,
        timeShort: input.timeShort?.trim() || ev.timeShort,
        location: input.location.trim(),
        notes: input.notes?.trim() || undefined,
        imageUri: input.imageUri?.trim() || ev.imageUri,
        participantMax,
        hideAddress: input.hideAddress,
        isPrivate: input.isPrivate === true,
        manualApproval: input.manualApproval,
        isBeta: input.isBeta === true,
      };
      const convTitle = `Sortie : ${next.title}`;
      const conversations = state.conversations.map((c) =>
        c.id === ev.conversationId ? { ...c, title: convTitle } : c,
      );
      syncEventToSheets(next);
      const conv = conversations.find((c) => c.id === ev.conversationId);
      if (conv) syncConversationToSheets(conv);
      return {
        events: state.events.map((e) => (e.id === eventId ? next : e)),
        conversations,
      };
    });
  },

  cancelEvent: (eventId) => {
    set((state) => {
      const ev = state.events.find((e) => e.id === eventId);
      if (!ev) return state;
      const cid = ev.conversationId;
      syncEventDeleteToSheets(eventId);
      syncConversationDeleteToSheets(cid);
      const { [cid]: _drop, ...restMsgs } = state.messagesByConversation;
      return {
        events: state.events.filter((e) => e.id !== eventId),
        conversations: state.conversations.filter((c) => c.id !== cid),
        messagesByConversation: restMsgs,
        favoriteConversationIds: state.favoriteConversationIds.filter(
          (id) => id !== cid,
        ),
      };
    });
    syncViewerSettingsFromState(get());
  },

  postEventGroupWelcome: (conversationId, eventTitle) => {
    const text = `La sortie « ${eventTitle} » est créée — discutez ici avec les participants.`;
    const msg: Message = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      authorName: "Système",
      text,
      sentAt: Date.now(),
      isOwn: false,
    };
    set((state) => {
      const prevMsgs = state.messagesByConversation[conversationId] ?? [];
      const next = {
        ...state.messagesByConversation,
        [conversationId]: [...prevMsgs, msg],
      };
      persistLocalMessages(next);
      return {
        messagesByConversation: next,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessagePreview: text.slice(0, 120),
                updatedAt: Date.now(),
              }
            : c,
        ),
      };
    });
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (conv) syncConversationToSheets(conv);
    pushMessageRemote(msg);
  },

  toggleConversationFavorite: (conversationId) =>
    set((state) => {
      const isFavorite = state.favoriteConversationIds.includes(conversationId);
      const newFavs = isFavorite
        ? state.favoriteConversationIds.filter((id) => id !== conversationId)
        : [...state.favoriteConversationIds, conversationId];

      const conversations = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isFavorite: !isFavorite } : c,
      );
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) syncConversationToSheets(conv);
      syncViewerSettingsFromState({
        ...state,
        favoriteConversationIds: newFavs,
      });

      return {
        favoriteConversationIds: newFavs,
        conversations,
      };
    }),

  getEventById: (id) => get().events.find((e) => e.id === id),

  getEventByConversationId: (conversationId) =>
    get().events.find((e) => e.conversationId === conversationId),

  sendMessage: (conversationId, text) => {
    const { viewerProfileDisplayName: authorName } = get();
    const authorId = useAuthStore.getState().user?.id;

    const newMessage: PersistedMessage = {
      id: Math.random().toString(36).substring(7),
      conversationId,
      authorId,
      authorName,
      text,
      sentAt: Date.now(),
    };

    set((state) => {
      const currentMessages = state.messagesByConversation[conversationId] || [];
      const next = {
        ...state.messagesByConversation,
        [conversationId]: [...currentMessages, { ...newMessage, isOwn: true }],
      };
      persistLocalMessages(next);
      return {
        messagesByConversation: next,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessagePreview: text, updatedAt: Date.now() }
            : c,
        ),
      };
    });

    const conv = get().conversations.find((c) => c.id === conversationId);
    if (conv) syncConversationToSheets(conv);
    pushMessageRemote(newMessage);
  },

  openOrCreateDmConversation: ({
    profilId,
    displayName,
    avatarUrl,
    avatarGradient,
  }) => {
    const state = get();
    const existing = state.conversations.find(
      (c) =>
        c.type === "dm" &&
        c.members.some((m) => !m.isSelf && m.profilId === profilId),
    );
    if (existing) return existing.id;

    const baseId = `dm-${profilId}`;
    const id = state.conversations.some((c) => c.id === baseId)
      ? `dm-${profilId}-${Date.now().toString(36)}`
      : baseId;

    const gradientPool: readonly [string, string][] = [
      ["#FF6B35", "#FF4081"],
      ["#9B5DE5", "#C23B8E"],
      ["#FFC107", "#FF9800"],
      ["#26C6DA", "#00BFA5"],
    ];
    let hash = 0;
    for (let i = 0; i < profilId.length; i++) hash += profilId.charCodeAt(i);
    const grad = avatarGradient ?? gradientPool[hash % gradientPool.length];

    const conv: Conversation = {
      id,
      title: displayName,
      type: "dm",
      lastMessagePreview: "",
      avatarGradient: grad,
      unreadCount: 0,
      updatedAt: Date.now(),
      isFavorite: false,
      memberCount: 2,
      members: [
        {
          id: `u-${profilId}`,
          name: displayName,
          isSelf: false,
          profilId,
          avatarUrl,
          avatarGradient: grad,
        },
        {
          id: "me",
          name: "Moi",
          isSelf: true,
          avatarGradient: ["#78909C", "#546E7A"],
        },
      ],
    };

    set((s) => ({
      conversations: [conv, ...s.conversations],
      messagesByConversation: {
        ...s.messagesByConversation,
        [id]: s.messagesByConversation[id] ?? [],
      },
    }));
    syncConversationToSheets(conv);
    return id;
  },

  markAsRead: (conversationId) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv || conv.unreadCount === 0) return;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
    const updated = get().conversations.find((c) => c.id === conversationId);
    if (updated) syncConversationToSheets(updated);
  },

  recordConversationOpened: (conversationId) => {
    if (!get().conversations.some((c) => c.id === conversationId)) return;
    const now = Date.now();
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastOpenedAt: now } : c,
      ),
    }));
    const updated = get().conversations.find((c) => c.id === conversationId);
    if (updated) syncConversationToSheets(updated);
  },

  addMemberToGroup: (conversationId, member) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              members: [...c.members.filter((m) => m.id !== member.id), member],
              memberCount:
                (c.memberCount || 0) +
                (c.members.some((m) => m.id === member.id) ? 0 : 1),
            }
          : c,
      ),
    }));
    const updated = get().conversations.find((c) => c.id === conversationId);
    if (updated) syncConversationToSheets(updated);
  },

  removeMemberFromGroup: (conversationId, memberId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              members: c.members.filter((m) => m.id !== memberId),
              memberCount: Math.max(0, (c.memberCount || 1) - 1),
            }
          : c,
      ),
    }));
    const updated = get().conversations.find((c) => c.id === conversationId);
    if (updated) syncConversationToSheets(updated);
  },

  leaveConversation: (conversationId) => {
    syncConversationDeleteToSheets(conversationId);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
    }));
  },

  updateConversationSettings: (conversationId, settings) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...settings } : c,
      ),
    }));
    const updated = get().conversations.find((c) => c.id === conversationId);
    if (updated) syncConversationToSheets(updated);
  },

  joinEvent: (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (event) {
      // Ensure conversation is added back if missing
      const convExists = get().conversations.some(
        (c) => c.id === event.conversationId,
      );
      if (!convExists) {
        const originalConv = MOCK_CONVERSATIONS.find(
          (c) => c.id === event.conversationId,
        );
        if (originalConv) {
          set((state) => ({
            conversations: [originalConv, ...state.conversations],
          }));
          syncConversationToSheets(originalConv);
        }
      }
    }

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: "inscrit",
              participantCount: Math.min(
                e.participantMax,
                e.participantCount + 1,
              ),
            }
          : e,
      ),
    }));
    const ev = get().events.find((e) => e.id === eventId);
    if (ev) syncEventToSheets(ev);
  },

  leaveEvent: (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (event) {
      // Remove associated conversation
      get().leaveConversation(event.conversationId);
    }

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: "inscrire",
              participantCount: Math.max(0, e.participantCount - 1),
            }
          : e,
      ),
    }));
    const ev = get().events.find((e) => e.id === eventId);
    if (ev) syncEventToSheets(ev);
  },

  inviteFriendToEvent: (eventId, friend) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const invited = new Set(event.invitedProfilIds ?? []);
    if (invited.has(friend.profilId)) return;
    const conv = state.conversations.find((c) => c.id === event.conversationId);
    const alreadyMember = (conv?.members ?? []).some(
      (m) => m.profilId === friend.profilId,
    );
    if (alreadyMember) return;

    const hostName = state.viewerProfileDisplayName.trim() || "L’organisateur";
    const firstName = friend.name.trim().split(/\s+/)[0] || friend.name;
    const systemText = `${hostName} a invité ${firstName} — une notification lui a été envoyée pour « ${event.title} ».`;

    const notif: AppNotification = {
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      kind: "event_invite_sent",
      eventId: event.id,
      eventTitle: event.title,
      inviteeName: friend.name,
      inviteeProfilId: friend.profilId,
    };

    const msg: Message = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      conversationId: event.conversationId,
      authorName: "Système",
      text: systemText,
      sentAt: Date.now(),
      isOwn: false,
    };

    set((s) => {
      const nextMsgs = {
        ...s.messagesByConversation,
        [event.conversationId]: [
          ...(s.messagesByConversation[event.conversationId] ?? []),
          msg,
        ],
      };
      persistLocalMessages(nextMsgs);
      const nextEvent = {
        ...event,
        invitedProfilIds: [...(event.invitedProfilIds ?? []), friend.profilId],
      };
      syncEventToSheets(nextEvent);
      syncNotificationToSheets(notif);
      return {
        events: s.events.map((e) => (e.id === eventId ? nextEvent : e)),
        appNotifications: [notif, ...s.appNotifications],
        messagesByConversation: nextMsgs,
        conversations: s.conversations.map((c) =>
          c.id === event.conversationId
            ? {
                ...c,
                lastMessagePreview: systemText.slice(0, 120),
                updatedAt: Date.now(),
              }
            : c,
        ),
      };
    });
    const updatedConv = get().conversations.find((c) => c.id === event.conversationId);
    if (updatedConv) syncConversationToSheets(updatedConv);
    pushMessageRemote(msg);
    const inviteeFirst =
      friend.name.trim().split(/\s+/)[0] || friend.name.trim() || friend.name;
    get().showToast(`Invitation envoyée à ${inviteeFirst}`);
  },

  loadDemoData: () => {
    set({
      conversations: MOCK_CONVERSATIONS,
      friends: MOCK_FRIENDS,
      suggestions: MOCK_SUGGESTIONS,
      friendRequestRejectedProfilIds: ["u050", "u051", "u052"],
    });
  },

  resetData: () => {
    // For new users: empty friends, but keep all suggestions (no mutual friends)
    set({
      conversations: [],
      messagesByConversation: {},
      friends: [],
      suggestions: MOCK_SUGGESTIONS,
      favoriteConversationIds: [],
      friendRequestSentProfilIds: [],
      friendRequestRejectedProfilIds: [],
      appNotifications: [],
      adminReports: [],
      moderationHiddenEventIds: [],
      moderationHiddenProfilIds: [],
      eventReminders: [],
    });
  },

  eventReminders: [],
  sendEventReminder: (eventId, participantId, participantName) => {
    const id = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const reminder: EventReminder = {
      id,
      eventId,
      eventTitle: get().events.find((e) => e.id === eventId)?.title || "",
      participantId,
      participantName,
      sentAt: Date.now(),
    };
    set((state) => ({ eventReminders: [reminder, ...state.eventReminders] }));
    get().showToast(`Relance envoyée à ${participantName.split(" ")[0]}`);

    // Simulate reading after a few seconds (verification de lecture)
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        get().markEventReminderAsRead(id);
      }, 4000 + Math.random() * 5000);
    }
  },
  markEventReminderAsRead: (reminderId) => {
    set((state) => ({
      eventReminders: state.eventReminders.map((r) =>
        r.id === reminderId ? { ...r, readAt: Date.now() } : r,
      ),
    }));
  },
}));

function initLocalChatHistory() {
  void (async () => {
    const history = await loadHistory();
    if (history.length === 0) return;

    const state = useMessagingStore.getState();
    const currentDisplayName = state.viewerProfileDisplayName;
    const mergedMsgs = { ...state.messagesByConversation };

    history.forEach((m) => {
      if (!mergedMsgs[m.conversationId]) mergedMsgs[m.conversationId] = [];
      if (!mergedMsgs[m.conversationId].some((msg) => msg.id === m.id)) {
        mergedMsgs[m.conversationId].push({
          ...m,
          isOwn: m.authorId
            ? m.authorId === useAuthStore.getState().user?.id
            : m.authorName === currentDisplayName,
        });
      }
    });

    useMessagingStore.setState({ messagesByConversation: mergedMsgs });
  })();
}

if (typeof window !== "undefined") {
  initLocalChatHistory();
}

