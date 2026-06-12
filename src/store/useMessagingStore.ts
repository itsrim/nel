import { create } from "zustand";
import {
  type Event,
  type Conversation,
  type ProfileVisit,
  type SuggestionProfile,
  type Friend,
  type Message,
  type GroupMember,
  type AppNotification,
  type AdminReportEntry,
  type EventReminder,
  type WaitlistEntry,
} from "../data/mockData";
import { isChatApiConfigured } from "../lib/chatConfig";
import { sendMessageRemote } from "../lib/chatSocket";
import { useLanguageStore } from "./useLanguageStore";
import { resolveMessageAccessFromStores } from "../lib/accessScope";
import { saveHistory, type PersistedMessage } from "../lib/chatPersistence";
import { useAuthStore } from "./useAuthStore";
import {
  syncAllViewerStateFromStore,
  syncConversationDeleteToSheets,
  syncConversationToSheets,
  syncEventDeleteToSheets,
  syncEventReminderToSheets,
  syncEventToSheets,
  syncFriendToSheets,
  syncNotificationToSheets,
  syncProfileDeleteToSheets,
  syncReportDeleteToSheets,
  syncReportToSheets,
  persistAppConfigToSheets,
} from "../lib/appSheetPersistence";
import {
  DEFAULT_PROFILE_BADGE_SUGGESTIONS,
  DEFAULT_VIEWER_BADGES,
} from "../constants/profileBadges";
import {
  isSubscriptionStillValid,
  subscriptionEndAfterMonths,
  readStoredTimestamp,
  writeStoredTimestamp,
} from "../lib/subscriptionDates";
import type { SubscriptionPlan } from "../lib/subscriptionPayment";
import {
  clearSubscriptionPaymentRecord,
  readSubscriptionPaymentRecord,
  writeSubscriptionPaymentRecord,
  type SubscriptionPaymentRecord,
} from "../lib/subscriptionPersistence";
import { hasViewerProAccess } from "../lib/viewerEntitlements";
import { buildEventPublicUrl } from "../lib/eventPublicUrl";
import {
  inviteProfileToFriend,
  resolveInviteProfile,
} from "../lib/eventInvites";
import {
  hasReachedDailyFriendRequestLimit,
  isEventDateBeforeToday,
  todayDateKey,
} from "../lib/eventDateKey";
import { eventHostedByViewer } from "../lib/eventHost";
import {
  KARMA_ATTENDANCE_REWARD,
  KARMA_DEFAULT,
  KARMA_ORGANIZE_COST,
  KARMA_ORGANIZE_SUCCESS_REWARD,
  KARMA_PREMIUM_PER_MONTH,
  VIEWER_KARMA_PARTICIPANT_ID,
  type OrganizerRatingValue,
  isMajorityBadOrganizerRating,
  normalizeKarma,
  presentParticipantIds,
  meetsEnrollmentThresholdForOrganizerKarma,
  shouldAwardOrganizerKarma,
  shouldFinalizeOrganizerKarma,
} from "../lib/karma";
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from "../lib/avatarUrl";
import {
  markForceReloadAckRevision,
  readAdminAppInfo,
  writeAdminAppInfo,
  type AdminAppInfo,
} from "../lib/adminAppInfo";

function buildViewerWaitlistEntry(
  state: Pick<MessagingState, "viewerProfileDisplayName" | "viewerProfileAvatarUrl">,
  reason: WaitlistEntry["reason"],
): WaitlistEntry {
  return {
    id: `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: state.viewerProfileDisplayName.trim() || "Moi",
    imageUrl: state.viewerProfileAvatarUrl,
    profilId: VIEWER_KARMA_PARTICIPANT_ID,
    reason,
  };
}

function viewerOnEventWaitlist(event: Event): boolean {
  return (event.waitlistEntries ?? []).some(
    (w) => w.profilId === VIEWER_KARMA_PARTICIPANT_ID,
  );
}

function stripViewerFromWaitlist(entries: WaitlistEntry[] | undefined): WaitlistEntry[] {
  return (entries ?? []).filter((w) => w.profilId !== VIEWER_KARMA_PARTICIPANT_ID);
}

function ensureEventGroupConversation(
  event: Event,
  set: (fn: (state: MessagingState) => Partial<MessagingState>) => void,
  get: () => MessagingState,
): void {
  const convExists = get().conversations.some((c) => c.id === event.conversationId);
  if (convExists) return;
  const newConv: Conversation = {
    id: event.conversationId,
    title: event.title,
    type: "group",
    lastMessagePreview: "",
    avatarGradient: ["#4a5568", "#2d3748"] as const,
    unreadCount: 0,
    updatedAt: Date.now(),
    isFavorite: false,
    members: [],
    memberCount: event.participantCount,
  };
  set((state) => ({
    conversations: [newConv, ...state.conversations],
  }));
  syncConversationToSheets(newConv);
}

const LS_VIEWER_AVATAR = "nel_viewer_profile_avatar_url";
const LS_VIEWER_NAME = "nel_viewer_profile_display_name";
const LS_VIEWER_AGE = "nel_viewer_profile_age";
const LS_VIEWER_BIO = "nel_viewer_profile_bio";
const LS_VIEWER_IS_PRO = "nel_viewer_profile_is_pro";
const LS_VIEWER_CITY = "nel_viewer_profile_city";
const LS_VIEWER_PRO_WEBSITE = "nel_viewer_pro_website_url";
const LS_VIEWER_PRO_SOCIAL = "nel_viewer_pro_social_url";
const LS_VIEWER_PRO_PHONE = "nel_viewer_pro_phone";
const LS_VIEWER_PRO_ADDRESS = "nel_viewer_pro_address";
const LS_VIEWER_PRO_LAT = "nel_viewer_pro_lat";
const LS_VIEWER_PRO_LNG = "nel_viewer_pro_lng";
const LS_VIEWER_BADGES = "nel_viewer_profile_badges";
const LS_PROFILE_BADGE_SUGGESTIONS = "nel_profile_badge_suggestions";
const LS_VIEWER_PREMIUM = "nel_viewer_premium";
const LS_VIEWER_PREMIUM_EXPIRES = "nel_viewer_premium_expires_at";
const LS_VIEWER_PRO_EXPIRES = "nel_viewer_pro_expires_at";
const LS_VIEWER_KARMA = "nel_viewer_karma";

const DEFAULT_VIEWER_AVATAR = DEFAULT_AVATAR_URL;
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

function readViewerKarma(): number {
  if (typeof window === "undefined") return KARMA_DEFAULT;
  try {
    const v = localStorage.getItem(LS_VIEWER_KARMA);
    if (v == null || v.trim() === "") return KARMA_DEFAULT;
    return normalizeKarma(Number(v));
  } catch {
    return KARMA_DEFAULT;
  }
}

function readViewerCoord(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    if (v == null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function readViewerPremiumState(): { active: boolean; expiresAt: number | null } {
  const expiresAt = readStoredTimestamp(LS_VIEWER_PREMIUM_EXPIRES);
  if (expiresAt != null) {
    const active = isSubscriptionStillValid(expiresAt);
    if (!active) {
      writeStoredTimestamp(LS_VIEWER_PREMIUM_EXPIRES, null);
      try {
        localStorage.setItem(LS_VIEWER_PREMIUM, "false");
      } catch {
        /* ignore */
      }
    }
    return { active, expiresAt: active ? expiresAt : null };
  }
  const legacy = readViewerPremium();
  return { active: legacy, expiresAt: null };
}

function readViewerProState(isProFlag: boolean): { active: boolean; expiresAt: number | null } {
  const expiresAt = readStoredTimestamp(LS_VIEWER_PRO_EXPIRES);
  if (expiresAt != null) {
    const active = isSubscriptionStillValid(expiresAt);
    if (!active) {
      writeStoredTimestamp(LS_VIEWER_PRO_EXPIRES, null);
      try {
        localStorage.setItem(LS_VIEWER_IS_PRO, "false");
      } catch {
        /* ignore */
      }
    }
    return { active, expiresAt: active ? expiresAt : null };
  }
  return { active: isProFlag, expiresAt: null };
}

function readViewerPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_VIEWER_PREMIUM) === "true";
  } catch {
    return false;
  }
}

function readViewerBadges(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_VIEWER_BADGES];
  try {
    const raw = localStorage.getItem(LS_VIEWER_BADGES);
    if (!raw) return [...DEFAULT_VIEWER_BADGES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_VIEWER_BADGES];
    return parsed.filter((b): b is string => typeof b === "string" && b.trim() !== "");
  } catch {
    return [...DEFAULT_VIEWER_BADGES];
  }
}

function readProfileBadgeSuggestions(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_PROFILE_BADGE_SUGGESTIONS];
  try {
    const raw = localStorage.getItem(LS_PROFILE_BADGE_SUGGESTIONS);
    if (!raw) return [...DEFAULT_PROFILE_BADGE_SUGGESTIONS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_PROFILE_BADGE_SUGGESTIONS];
    return parsed.filter((b): b is string => typeof b === "string" && b.trim() !== "");
  } catch {
    return [...DEFAULT_PROFILE_BADGE_SUGGESTIONS];
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

export type AdminProfilePatch = {
  name?: string;
  pseudo?: string;
  age?: number | null;
  city?: string;
  bio?: string;
  memberSince?: string;
  verified?: boolean;
  isPro?: boolean;
  karma?: number;
  imageUrl?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  proAddress?: string;
  stats?: { reliability?: number; events?: number; friends?: number };
};

function pushMessageRemote(message: PersistedMessage) {
  if (!isChatApiConfigured()) return;
  sendMessageRemote(message);
}

function persistLocalMessages(messagesByConversation: Record<string, Message[]>) {
  saveHistory(messagesByConversation, resolveMessageAccessFromStores());
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
    nelDemoIsPremium: state.nelDemoIsPremium,
    viewerPremiumExpiresAt: state.viewerPremiumExpiresAt,
    viewerProExpiresAt: state.viewerProExpiresAt,
    premiumSubscriptionPayment: state.premiumSubscriptionPayment,
    proSubscriptionPayment: state.proSubscriptionPayment,
    viewerProfileBadges: state.viewerProfileBadges,
    profileBadgeSuggestions: state.profileBadgeSuggestions,
    viewerProfileCity: state.viewerProfileCity,
    viewerProfileAge: state.viewerProfileAge,
    viewerProfileBio: state.viewerProfileBio,
    language: useLanguageStore.getState().language,
    viewerProWebsiteUrl: state.viewerProWebsiteUrl,
    viewerProSocialUrl: state.viewerProSocialUrl,
    viewerProPhone: state.viewerProPhone,
    viewerProAddress: state.viewerProAddress,
    viewerProLat: state.viewerProLat,
    viewerProLng: state.viewerProLng,
    viewerKarma: state.viewerKarma,
    friendRequestSentProfilIds: state.friendRequestSentProfilIds,
    friendRequestRejectedProfilIds: state.friendRequestRejectedProfilIds,
    friendRequestDailySentDateKey: state.friendRequestDailySentDateKey,
    favoriteConversationIds: state.favoriteConversationIds,
    moderationHiddenEventIds: state.moderationHiddenEventIds,
    moderationHiddenProfilIds: state.moderationHiddenProfilIds,
  });
}

interface MessagingState {
  /** Synchronisé avec l’interrupteur « Mode admin » du profil. */
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  /** Synchronisé avec l’interrupteur « Premium » du profil (aperçu nel). */
  nelDemoIsPremium: boolean;
  setNelDemoIsPremium: (value: boolean) => void;
  viewerPremiumExpiresAt: number | null;
  viewerProExpiresAt: number | null;
  premiumSubscriptionPayment: SubscriptionPaymentRecord;
  proSubscriptionPayment: SubscriptionPaymentRecord;
  activateViewerSubscription: (
    plan: SubscriptionPlan,
    months?: number,
    payment?: { validated?: boolean; transactionId?: string },
  ) => void;
  cancelViewerSubscription: (plan: SubscriptionPlan) => void;
  /** Photo de profil (hero) — même source que l’onglet Profil, persistée. */
  viewerProfileAvatarUrl: string;
  setViewerProfileAvatarUrl: (url: string) => void;
  /** Prénom / pseudo affiché (hero, hôte, tuile « moi »). */
  viewerProfileDisplayName: string;
  setViewerProfileDisplayName: (name: string) => void;
  /** Âge (inscription — non modifiable par l'utilisateur). */
  viewerProfileAge: string;
  setViewerProfileAge: (age: string) => void;
  /** Bio affichée sur le profil. */
  viewerProfileBio: string;
  setViewerProfileBio: (bio: string) => void;
  /** Compte professionnel (coche professionnel dans les préférences) */
  viewerProfileIsPro: boolean;
  setViewerProfileIsPro: (value: boolean) => void;
  viewerProfileBadges: string[];
  setViewerProfileBadges: (badges: string[]) => void;
  /** Catalogue global des badges suggérés (admin). */
  profileBadgeSuggestions: string[];
  setProfileBadgeSuggestions: (badges: string[]) => void;
  /** Réglages globaux admin (splash, modale d'information). */
  adminAppInfo: AdminAppInfo;
  updateAdminAppInfo: (patch: Partial<AdminAppInfo>) => void;
  publishAnnouncement: () => void;
  /** Admin : badges d’un profil (onglet profiles / Sheets). */
  updateProfileBadges: (profilId: string, badges: string[]) => void;
  /** Admin : met à jour les informations d’un profil (fiche, suggestions, visites). */
  updateProfile: (profilId: string, patch: AdminProfilePatch) => void;
  /** Admin : supprime définitivement une discussion et ses messages. */
  adminDeleteConversation: (conversationId: string) => void;
  /** Admin : supprime définitivement une sortie et son groupe de discussion. */
  adminDeleteEvent: (eventId: string) => void;
  /** Admin : supprime un utilisateur (profil, suggestions, visites, fils DM). */
  adminDeleteProfile: (profilId: string) => void;
  persistViewerSettingsToSheets: () => void;
  hydrateViewerProfileFields: (fields: { age?: string; bio?: string }) => void;
  viewerProfileCity: string;
  setViewerProfileCity: (city: string) => void;
  viewerProWebsiteUrl: string;
  setViewerProWebsiteUrl: (url: string) => void;
  viewerProSocialUrl: string;
  setViewerProSocialUrl: (url: string) => void;
  viewerProPhone: string;
  setViewerProPhone: (phone: string) => void;
  viewerProAddress: string;
  setViewerProAddress: (address: string) => void;
  viewerProLat: number | null;
  viewerProLng: number | null;
  setViewerProLocation: (address: string, lat: number, lng: number) => void;
  viewerKarma: number;
  validateEventParticipantPresent: (
    eventId: string,
    participantProfilId: string,
  ) => void;
  submitOrganizerRating: (
    eventId: string,
    rating: OrganizerRatingValue,
  ) => void;
  finalizeEventOrganizerKarma: (eventId: string) => void;
  events: Event[];
  conversations: Conversation[];
  profileVisits: ProfileVisit[];
  suggestions: SuggestionProfile[];
  friends: Friend[];
  /** Profils (`profilId`) à qui une demande d’ami a déjà été envoyée (démo — irréversible). */
  friendRequestSentProfilIds: string[];
  /** Demande refusée par l’autre (démo — ne pas renvoyer). */
  friendRequestRejectedProfilIds: string[];
  /** Jour calendaire (`YYYY-MM-DD`) de la dernière demande d’ami envoyée (limite : 1 / jour). */
  friendRequestDailySentDateKey: string | null;
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
  joinWaitlist: (eventId: string) => void;
  leaveWaitlist: (eventId: string) => void;
  approveWaitlistEntry: (eventId: string, entryId: string) => void;
  rejectWaitlistEntry: (eventId: string, entryId: string) => void;
  /** Organisateur : invite un ami (notif in-app + message système dans le chat de la sortie). */
  inviteFriendToEvent: (eventId: string, friend: Friend) => void;
  /** Invite un profil (ami, suggestion ou annuaire) par `profilId`. */
  inviteProfilToEvent: (eventId: string, profilId: string) => void;
  /** Invite plusieurs profils d’un coup (admin / organisateur). */
  inviteProfilsToEvent: (eventId: string, profilIds: string[]) => void;
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

export const useMessagingStore = create<MessagingState>((set, get) => {
  const premiumInit = readViewerPremiumState();
  const proInit = readViewerProState(
    typeof window !== "undefined"
      ? localStorage.getItem(LS_VIEWER_IS_PRO) === "true"
      : false,
  );
  const premiumPaymentInit = readSubscriptionPaymentRecord("premium");
  const proPaymentInit = readSubscriptionPaymentRecord("pro");

  const applyViewerKarma = (delta: number) => {
    const next = normalizeKarma(get().viewerKarma + delta);
    try {
      localStorage.setItem(LS_VIEWER_KARMA, String(next));
    } catch {
      /* ignore */
    }
    set({ viewerKarma: next });
    syncViewerSettingsFromState(get());
  };

  const adjustFriendKarma = (profilId: string, delta: number) => {
    set((state) => ({
      friends: state.friends.map((f) =>
        f.profilId === profilId
          ? { ...f, karma: normalizeKarma((f.karma ?? KARMA_DEFAULT) + delta) }
          : f,
      ),
    }));
    const updated = get().friends.find((f) => f.profilId === profilId);
    if (updated) syncFriendToSheets(updated);
  };

  const applyOrganizerKarmaOutcome = (event: Event): Event => {
    const isPast = isEventDateBeforeToday(event.dateKey);
    const presentIds = presentParticipantIds(event.validatedPresentProfilIds ?? []);
    const ratings = event.organizerRatings ?? [];
    const rewarded = event.karmaOrganizerRewarded === true;
    const denied = event.karmaOrganizerDenied === true;

    if (rewarded || denied) return event;
    if (!shouldFinalizeOrganizerKarma(presentIds, ratings, isPast)) return event;

    if (isMajorityBadOrganizerRating(presentIds, ratings)) {
      if (event.hostedByViewer || eventHostedByViewer(event)) {
        get().showToast("Pas de bonus karma : majorité de participants insatisfaits.");
      }
      return { ...event, karmaOrganizerDenied: true };
    }

    if (
      !meetsEnrollmentThresholdForOrganizerKarma(
        event.participantCount,
        event.participantMax,
      )
    ) {
      if (event.hostedByViewer || eventHostedByViewer(event)) {
        get().showToast(
          "Pas de bonus karma : moins de la moitié des places étaient inscrites.",
        );
      }
      return { ...event, karmaOrganizerDenied: true };
    }

    if (
      !shouldAwardOrganizerKarma(
        presentIds,
        ratings,
        isPast,
        rewarded,
        denied,
        event.participantCount,
        event.participantMax,
      )
    ) {
      return event;
    }

    if (event.hostedByViewer || eventHostedByViewer(event)) {
      applyViewerKarma(KARMA_ORGANIZE_SUCCESS_REWARD);
      get().showToast(
        `+${KARMA_ORGANIZE_SUCCESS_REWARD} karma — sortie réussie !`,
      );
    }

    return { ...event, karmaOrganizerRewarded: true };
  };

  const persistEventKarmaUpdate = (eventId: string, nextEvent: Event) => {
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? nextEvent : e)),
    }));
    syncEventToSheets(nextEvent);
  };

  return {
  isAdmin: false,
  setIsAdmin: (value) => set({ isAdmin: value }),
  nelDemoIsPremium: premiumInit.active,
  viewerPremiumExpiresAt: premiumInit.expiresAt,
  viewerProExpiresAt: proInit.expiresAt,
  premiumSubscriptionPayment: premiumPaymentInit,
  proSubscriptionPayment: proPaymentInit,
  setNelDemoIsPremium: (value) => {
    try {
      localStorage.setItem(LS_VIEWER_PREMIUM, String(value));
      if (!value) writeStoredTimestamp(LS_VIEWER_PREMIUM_EXPIRES, null);
    } catch {
      /* ignore */
    }
    set({
      nelDemoIsPremium: value,
      viewerPremiumExpiresAt: value ? get().viewerPremiumExpiresAt : null,
    });
    syncViewerSettingsFromState(get());
  },

  activateViewerSubscription: (plan, months = 1, payment) => {
    const state = get();
    const currentExpires =
      plan === "premium" ? state.viewerPremiumExpiresAt : state.viewerProExpiresAt;
    const start = isSubscriptionStillValid(currentExpires)
      ? currentExpires!
      : Date.now();
    const expiresAt = subscriptionEndAfterMonths(months, start);
    const paidAt = Date.now();
    const paymentRecord: SubscriptionPaymentRecord = {
      paymentValidated: payment?.validated !== false,
      months,
      lastPaymentAt: paidAt,
      lastTransactionId: payment?.transactionId?.trim() || null,
    };
    writeSubscriptionPaymentRecord(plan, paymentRecord);
    if (plan === "premium") {
      try {
        localStorage.setItem(LS_VIEWER_PREMIUM, "true");
        writeStoredTimestamp(LS_VIEWER_PREMIUM_EXPIRES, expiresAt);
      } catch {
        /* ignore */
      }
      const karmaBonus = KARMA_PREMIUM_PER_MONTH * months;
      const nextKarma = normalizeKarma(state.viewerKarma + karmaBonus);
      try {
        localStorage.setItem(LS_VIEWER_KARMA, String(nextKarma));
      } catch {
        /* ignore */
      }
      set({
        nelDemoIsPremium: true,
        viewerPremiumExpiresAt: expiresAt,
        premiumSubscriptionPayment: paymentRecord,
        viewerKarma: nextKarma,
      });
      get().showToast(`+${karmaBonus} karma Premium !`);
    } else {
      try {
        localStorage.setItem(LS_VIEWER_IS_PRO, "true");
        writeStoredTimestamp(LS_VIEWER_PRO_EXPIRES, expiresAt);
      } catch {
        /* ignore */
      }
      set({
        viewerProfileIsPro: true,
        viewerProExpiresAt: expiresAt,
        proSubscriptionPayment: paymentRecord,
      });
    }
    syncViewerSettingsFromState(get());
  },

  cancelViewerSubscription: (plan) => {
    clearSubscriptionPaymentRecord(plan);
    const cleared: SubscriptionPaymentRecord = {
      paymentValidated: false,
      months: null,
      lastPaymentAt: null,
      lastTransactionId: null,
    };
    if (plan === "premium") {
      try {
        localStorage.setItem(LS_VIEWER_PREMIUM, "false");
        writeStoredTimestamp(LS_VIEWER_PREMIUM_EXPIRES, null);
      } catch {
        /* ignore */
      }
      set({
        nelDemoIsPremium: false,
        viewerPremiumExpiresAt: null,
        premiumSubscriptionPayment: cleared,
      });
    } else {
      try {
        localStorage.setItem(LS_VIEWER_IS_PRO, "false");
        writeStoredTimestamp(LS_VIEWER_PRO_EXPIRES, null);
      } catch {
        /* ignore */
      }
      set({
        viewerProfileIsPro: false,
        viewerProExpiresAt: null,
        proSubscriptionPayment: cleared,
      });
    }
    syncViewerSettingsFromState(get());
  },

  viewerProfileAvatarUrl: resolveAvatarUrl(
    readViewerStorage(LS_VIEWER_AVATAR, DEFAULT_VIEWER_AVATAR),
  ),
  setViewerProfileAvatarUrl: (url) => {
    const resolved = resolveAvatarUrl(url);
    try {
      localStorage.setItem(LS_VIEWER_AVATAR, resolved);
    } catch {
      /* ignore */
    }
    set({ viewerProfileAvatarUrl: resolved });
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

  viewerProfileAge: readViewerStorage(LS_VIEWER_AGE, ""),
  setViewerProfileAge: (age) => {
    const v = age.trim();
    try {
      localStorage.setItem(LS_VIEWER_AGE, v);
    } catch {
      /* ignore */
    }
    set({ viewerProfileAge: v });
    syncViewerSettingsFromState(get());
  },

  viewerProfileBio: readViewerStorage(LS_VIEWER_BIO, ""),
  setViewerProfileBio: (bio) => {
    const v = bio.trim();
    try {
      localStorage.setItem(LS_VIEWER_BIO, v);
    } catch {
      /* ignore */
    }
    set({ viewerProfileBio: v });
    syncViewerSettingsFromState(get());
  },

  viewerProfileIsPro: proInit.active,
  setViewerProfileIsPro: (value) => {
    try {
      localStorage.setItem(LS_VIEWER_IS_PRO, String(value));
    } catch {
      /* ignore */
    }
    set({ viewerProfileIsPro: value });
    syncViewerSettingsFromState(get());
  },

  viewerProfileBadges: readViewerBadges(),
  setViewerProfileBadges: (badges) => {
    const next = badges.map((b) => b.trim()).filter(Boolean);
    try {
      localStorage.setItem(LS_VIEWER_BADGES, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    set({ viewerProfileBadges: next });
    syncViewerSettingsFromState(get());
  },

  profileBadgeSuggestions: readProfileBadgeSuggestions(),
  setProfileBadgeSuggestions: (badges) => {
    const next = badges.map((b) => b.trim()).filter(Boolean);
    const unique = next.filter(
      (label, index, arr) =>
        arr.findIndex((x) => x.toLowerCase() === label.toLowerCase()) === index,
    );
    try {
      localStorage.setItem(LS_PROFILE_BADGE_SUGGESTIONS, JSON.stringify(unique));
    } catch {
      /* ignore */
    }
    set({ profileBadgeSuggestions: unique });
    syncViewerSettingsFromState(get());
  },

  adminAppInfo: readAdminAppInfo(),
  updateAdminAppInfo: (patch) => {
    const next = {
      ...get().adminAppInfo,
      ...patch,
      configUpdatedAt: Date.now(),
    };
    writeAdminAppInfo(next);
    set({ adminAppInfo: next });
    void persistAppConfigToSheets(next).catch((err) => {
      console.error("Échec sync app_config vers Google Sheets:", err);
    });
  },
  publishAnnouncement: () => {
    const prev = get().adminAppInfo;
    const next = {
      ...prev,
      announcementRevision: prev.announcementRevision + 1,
      forceReloadRevision: prev.forceAppReloadOnPublish
        ? prev.forceReloadRevision + 1
        : prev.forceReloadRevision,
      configUpdatedAt: Date.now(),
    };
    writeAdminAppInfo(next);
    set({ adminAppInfo: next });
    void persistAppConfigToSheets(next).catch((err) => {
      console.error("Échec sync app_config vers Google Sheets:", err);
    });
    if (next.forceAppReloadOnPublish) {
      markForceReloadAckRevision(next.forceReloadRevision);
    }
  },

  updateProfileBadges: (profilId, badges) => {
    const id = profilId.trim();
    if (!id) return;
    const next = badges.map((b) => b.trim()).filter(Boolean);
    set((state) => {
      const idx = state.friends.findIndex((f) => f.profilId === id);
      if (idx >= 0) {
        const friends = [...state.friends];
        friends[idx] = { ...friends[idx], badges: next };
        return { friends };
      }
      const sug = state.suggestions.find((s) => s.id === id);
      const visit = state.profileVisits.find((v) => v.id === id);
      const label = sug?.pseudo ?? visit?.name ?? id;
      const imageUrl = sug?.imageUrl ?? visit?.avatarUrl ?? "";
      const age = sug?.age ?? visit?.age ?? null;
      const bootstrap: Friend = {
        profilId: id,
        name: label,
        pseudo: label,
        age,
        city: "",
        imageUrl,
        eventsInCommon: 0,
        mainChatConversationId: "",
        badges: next,
        mutualFriend: false,
      };
      return { friends: [...state.friends, bootstrap] };
    });
    const updated = get().friends.find((f) => f.profilId === id);
    if (updated) syncFriendToSheets(updated);
    get().showToast("Badges mis à jour.");
  },

  updateProfile: (profilId, patch) => {
    const id = profilId.trim();
    if (!id) return;
    set((state) => {
      const applyPatch = (f: Friend): Friend => {
        const next: Friend = { ...f };
        if (patch.name !== undefined) next.name = patch.name.trim();
        if (patch.pseudo !== undefined) next.pseudo = patch.pseudo.trim();
        if (patch.age !== undefined) next.age = patch.age;
        if (patch.city !== undefined) next.city = patch.city.trim();
        if (patch.bio !== undefined) next.bio = patch.bio.trim() || undefined;
        if (patch.memberSince !== undefined) {
          next.memberSince = patch.memberSince.trim() || undefined;
        }
        if (patch.verified !== undefined) next.verified = patch.verified;
        if (patch.isPro !== undefined) next.isPro = patch.isPro;
        if (patch.karma !== undefined) next.karma = patch.karma;
        if (patch.imageUrl !== undefined) next.imageUrl = patch.imageUrl.trim();
        if (patch.websiteUrl !== undefined) {
          next.websiteUrl = patch.websiteUrl.trim() || undefined;
        }
        if (patch.socialUrl !== undefined) {
          next.socialUrl = patch.socialUrl.trim() || undefined;
        }
        if (patch.phone !== undefined) next.phone = patch.phone.trim() || undefined;
        if (patch.proAddress !== undefined) {
          next.proAddress = patch.proAddress.trim() || undefined;
        }
        if (patch.stats !== undefined) {
          next.stats = {
            reliability:
              patch.stats.reliability ?? next.stats?.reliability ?? 0,
            events: patch.stats.events ?? next.stats?.events ?? 0,
            friends: patch.stats.friends ?? next.stats?.friends ?? 0,
          };
        }
        return next;
      };

      let friends = state.friends.map((f) =>
        f.profilId === id ? applyPatch(f) : f,
      );
      if (!friends.some((f) => f.profilId === id)) {
        const sug = state.suggestions.find((s) => s.id === id);
        const visit = state.profileVisits.find((v) => v.id === id);
        const label =
          patch.name?.trim() ||
          patch.pseudo?.trim() ||
          sug?.pseudo ||
          visit?.name ||
          id;
        const bootstrap: Friend = applyPatch({
          profilId: id,
          name: label,
          pseudo: patch.pseudo?.trim() || sug?.pseudo || label,
          age: patch.age ?? sug?.age ?? visit?.age ?? null,
          city: patch.city?.trim() ?? "",
          imageUrl:
            patch.imageUrl?.trim() || sug?.imageUrl || visit?.avatarUrl || "",
          eventsInCommon: 0,
          mainChatConversationId: "",
          badges: [],
          mutualFriend: false,
          karma: patch.karma ?? 5,
        });
        friends = [...friends, bootstrap];
      }

      const displayName =
        patch.pseudo?.trim() ||
        patch.name?.trim() ||
        friends.find((f) => f.profilId === id)?.pseudo ||
        friends.find((f) => f.profilId === id)?.name;

      const suggestions = state.suggestions.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          pseudo: displayName ?? s.pseudo,
          age: patch.age ?? s.age,
          imageUrl: patch.imageUrl?.trim() || s.imageUrl,
        };
      });

      const profileVisits = state.profileVisits.map((v) => {
        if (v.id !== id) return v;
        return {
          ...v,
          name: displayName ?? v.name,
          age: patch.age ?? v.age,
          avatarUrl: patch.imageUrl?.trim() || v.avatarUrl,
        };
      });

      return { friends, suggestions, profileVisits };
    });
    const updated = get().friends.find((f) => f.profilId === id);
    if (updated) syncFriendToSheets(updated);
    get().showToast("Profil mis à jour.");
  },

  adminDeleteConversation: (conversationId) => {
    if (!get().isAdmin) return;
    const cid = conversationId.trim();
    if (!cid) return;
    syncConversationDeleteToSheets(cid);
    set((state) => {
      const { [cid]: _drop, ...restMsgs } = state.messagesByConversation;
      return {
        conversations: state.conversations.filter((c) => c.id !== cid),
        messagesByConversation: restMsgs,
        favoriteConversationIds: state.favoriteConversationIds.filter(
          (id) => id !== cid,
        ),
      };
    });
    syncViewerSettingsFromState(get());
    get().showToast("Discussion supprimée.");
  },

  adminDeleteEvent: (eventId) => {
    if (!get().isAdmin) return;
    const id = eventId.trim();
    if (!id) return;
    set((state) => {
      const event = state.events.find((e) => e.id === id);
      if (!event) return state;
      const cid = event.conversationId;
      syncEventDeleteToSheets(id, event.sheetOwnerUserId);
      syncConversationDeleteToSheets(cid);
      const { [cid]: _drop, ...restMsgs } = state.messagesByConversation;
      return {
        events: state.events.filter((e) => e.id !== id),
        conversations: state.conversations.filter((c) => c.id !== cid),
        messagesByConversation: restMsgs,
        favoriteConversationIds: state.favoriteConversationIds.filter(
          (x) => x !== cid,
        ),
        moderationHiddenEventIds: state.moderationHiddenEventIds.filter(
          (x) => x !== id,
        ),
      };
    });
    syncViewerSettingsFromState(get());
    get().showToast("Sortie supprimée.");
  },

  adminDeleteProfile: (profilId) => {
    if (!get().isAdmin) return;
    const id = profilId.trim();
    if (!id) return;
    const state = get();
    const dmConvIds = new Set<string>();
    for (const c of state.conversations) {
      if (c.type === "dm" && c.members?.some((m) => m.profilId === id)) {
        dmConvIds.add(c.id);
      }
    }
    const friend = state.friends.find((f) => f.profilId === id);
    if (friend?.mainChatConversationId) {
      dmConvIds.add(friend.mainChatConversationId);
    }
    dmConvIds.forEach((cid) => syncConversationDeleteToSheets(cid));
    syncProfileDeleteToSheets(id);
    set((s) => {
      const nextMessages = { ...s.messagesByConversation };
      dmConvIds.forEach((cid) => {
        delete nextMessages[cid];
      });
      const conversations = s.conversations
        .filter((c) => !dmConvIds.has(c.id))
        .map((c) => {
          if (!c.members?.some((m) => m.profilId === id)) return c;
          const members = c.members.filter((m) => m.profilId !== id);
          return {
            ...c,
            members,
            memberCount: members.length,
          };
        });
      return {
        friends: s.friends.filter((f) => f.profilId !== id),
        suggestions: s.suggestions.filter((sug) => sug.id !== id),
        profileVisits: s.profileVisits.filter((v) => v.id !== id),
        conversations,
        messagesByConversation: nextMessages,
        favoriteConversationIds: s.favoriteConversationIds.filter(
          (fid) => !dmConvIds.has(fid),
        ),
        friendRequestSentProfilIds: s.friendRequestSentProfilIds.filter(
          (pid) => pid !== id,
        ),
        friendRequestRejectedProfilIds: s.friendRequestRejectedProfilIds.filter(
          (pid) => pid !== id,
        ),
        moderationHiddenProfilIds: s.moderationHiddenProfilIds.includes(id)
          ? s.moderationHiddenProfilIds
          : [...s.moderationHiddenProfilIds, id],
      };
    });
    syncViewerSettingsFromState(get());
    get().showToast("Utilisateur supprimé.");
  },

  viewerProfileCity: readViewerStorage(LS_VIEWER_CITY, ""),
  persistViewerSettingsToSheets: () => {
    syncViewerSettingsFromState(get());
  },

  hydrateViewerProfileFields: (fields) => {
    const patch: Partial<Pick<MessagingState, "viewerProfileAge" | "viewerProfileBio">> = {};
    if (fields.age !== undefined) {
      const v = fields.age.trim();
      try {
        localStorage.setItem(LS_VIEWER_AGE, v);
      } catch {
        /* ignore */
      }
      patch.viewerProfileAge = v;
    }
    if (fields.bio !== undefined) {
      const v = fields.bio.trim();
      try {
        localStorage.setItem(LS_VIEWER_BIO, v);
      } catch {
        /* ignore */
      }
      patch.viewerProfileBio = v;
    }
    if (Object.keys(patch).length > 0) set(patch);
  },

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

  viewerProAddress: readViewerStorage(LS_VIEWER_PRO_ADDRESS, ""),
  setViewerProAddress: (address) => {
    try {
      localStorage.setItem(LS_VIEWER_PRO_ADDRESS, address);
    } catch {
      /* ignore */
    }
    set({ viewerProAddress: address });
    syncViewerSettingsFromState(get());
  },

  viewerProLat: readViewerCoord(LS_VIEWER_PRO_LAT),
  viewerProLng: readViewerCoord(LS_VIEWER_PRO_LNG),
  setViewerProLocation: (address, lat, lng) => {
    const v = address.trim();
    try {
      localStorage.setItem(LS_VIEWER_PRO_ADDRESS, v);
      localStorage.setItem(LS_VIEWER_PRO_LAT, String(lat));
      localStorage.setItem(LS_VIEWER_PRO_LNG, String(lng));
    } catch {
      /* ignore */
    }
    set({ viewerProAddress: v, viewerProLat: lat, viewerProLng: lng });
    syncViewerSettingsFromState(get());
  },

  viewerKarma: readViewerKarma(),

  validateEventParticipantPresent: (eventId, participantProfilId) => {
    const pid = participantProfilId.trim();
    if (!pid) return;
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const isOrganizer =
      event.status === "organisateur" &&
      (event.hostedByViewer || eventHostedByViewer(event));
    if (!isOrganizer) return;

    const validated = new Set(event.validatedPresentProfilIds ?? []);
    if (validated.has(pid)) return;
    validated.add(pid);

    if (pid !== VIEWER_KARMA_PARTICIPANT_ID) {
      adjustFriendKarma(pid, KARMA_ATTENDANCE_REWARD);
    } else {
      applyViewerKarma(KARMA_ATTENDANCE_REWARD);
    }
    get().showToast(`+${KARMA_ATTENDANCE_REWARD} karma`);

    const withPresence: Event = {
      ...event,
      validatedPresentProfilIds: [...validated],
    };
    persistEventKarmaUpdate(eventId, applyOrganizerKarmaOutcome(withPresence));
  },

  submitOrganizerRating: (eventId, rating) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    if (event.hostedByViewer || eventHostedByViewer(event)) return;

    const validated = event.validatedPresentProfilIds ?? [];
    if (!validated.includes(VIEWER_KARMA_PARTICIPANT_ID)) return;

    const ratings = [...(event.organizerRatings ?? [])];
    const idx = ratings.findIndex(
      (r) => r.profilId === VIEWER_KARMA_PARTICIPANT_ID,
    );
    const entry = { profilId: VIEWER_KARMA_PARTICIPANT_ID, rating };
    if (idx >= 0) ratings[idx] = entry;
    else ratings.push(entry);

    const withRating: Event = { ...event, organizerRatings: ratings };
    persistEventKarmaUpdate(eventId, applyOrganizerKarmaOutcome(withRating));
  },

  finalizeEventOrganizerKarma: (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return;
    if (!isEventDateBeforeToday(event.dateKey)) return;
    persistEventKarmaUpdate(eventId, applyOrganizerKarmaOutcome(event));
  },

  events: [],
  conversations: [],
  profileVisits: [],
  suggestions: [],
  friends: [],
  friendRequestSentProfilIds: [],
  friendRequestRejectedProfilIds: [],
  friendRequestDailySentDateKey: null,
  sendFriendRequest: (profilId) => {
    const id = profilId.trim();
    if (!id) return;
    const {
      friends,
      friendRequestSentProfilIds,
      friendRequestRejectedProfilIds,
      friendRequestDailySentDateKey,
    } = get();
    if (friends.find((f) => f.profilId === id)?.mutualFriend === true) return;
    if (friendRequestRejectedProfilIds.includes(id)) return;
    if (friendRequestSentProfilIds.includes(id)) {
      return;
    }
    if (hasReachedDailyFriendRequestLimit(friendRequestDailySentDateKey)) {
      get().showToast("Vous ne pouvez envoyer qu’une demande d’ami par jour.");
      return;
    }
    set({
      friendRequestSentProfilIds: [...friendRequestSentProfilIds, id],
      friendRequestDailySentDateKey: todayDateKey(),
    });
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
        syncEventDeleteToSheets(ev.id, ev.sheetOwnerUserId);
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
  favoriteConversationIds: [],
  messagesByConversation: {},

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
    const state = get();
    const id = `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const priceLabel = input.priceLabel?.trim() || "Gratuit";
    const { viewerProfileDisplayName: vn, viewerProfileAvatarUrl: va } = state;
    if (!hasViewerProAccess(state)) {
      applyViewerKarma(-KARMA_ORGANIZE_COST);
    }
    const hostName = vn.trim() || "Moi";
    const sheetOwnerUserId = useAuthStore.getState().user?.id;
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
      participantAvatars: [va],
      hostedByViewer: true,
      creatorId: hostName,
      hideAddress: input.hideAddress,
      isPrivate: input.isPrivate === true,
      manualApproval: input.manualApproval,
      invitedProfilIds: [],
      publicUrl: buildEventPublicUrl(id),
      karmaOrganizePaid: !hasViewerProAccess(state),
      validatedPresentProfilIds: [],
      karmaJoinPaidProfilIds: [],
      organizerRatings: [],
      sheetOwnerUserId,
    };
    set((s) => ({ events: [event, ...s.events] }));
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
      const convTitle = `${next.title} — ${next.dateLabel.split(" ")[0]}`;
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
    const before = get();
    if (before.isAdmin) {
      get().adminDeleteEvent(eventId);
      return;
    }
    const ev = before.events.find((e) => e.id === eventId);
    if (
      ev?.karmaOrganizePaid &&
      !ev.karmaOrganizerRewarded &&
      !hasViewerProAccess(before)
    ) {
      applyViewerKarma(KARMA_ORGANIZE_COST);
    }
    set((state) => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event) return state;
      const cid = event.conversationId;
      syncEventDeleteToSheets(eventId, event.sheetOwnerUserId);
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
      authorId: authorId ?? useAuthStore.getState().user?.id,
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
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event || event.status === "organisateur") return;

    if (event.manualApproval && event.participantCount < event.participantMax) {
      get().joinWaitlist(eventId);
      return;
    }
    if (event.participantCount >= event.participantMax) {
      get().joinWaitlist(eventId);
      return;
    }

    ensureEventGroupConversation(event, set, get);

    if (!hasViewerProAccess(state)) {
      applyViewerKarma(-KARMA_JOIN_COST);
    }

    set((s) => ({
      events: s.events.map((e) => {
        if (e.id !== eventId) return e;
        const paid = new Set(e.karmaJoinPaidProfilIds ?? []);
        if (!hasViewerProAccess(s)) {
          paid.add(VIEWER_KARMA_PARTICIPANT_ID);
        }
        return {
          ...e,
          waitlistEntries: stripViewerFromWaitlist(e.waitlistEntries),
          status: "inscrit" as const,
          participantCount: Math.min(e.participantMax, e.participantCount + 1),
          karmaJoinPaidProfilIds: [...paid],
        };
      }),
    }));
    const ev = get().events.find((e) => e.id === eventId);
    if (ev) syncEventToSheets(ev);
  },

  joinWaitlist: (eventId) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event || event.status === "organisateur") return;
    if (viewerOnEventWaitlist(event) || event.status === "inscrit") return;

    const reason: WaitlistEntry["reason"] =
      event.manualApproval && event.participantCount < event.participantMax
        ? "en_attente"
        : "overflow";

    if (reason === "overflow" && event.participantCount < event.participantMax) {
      get().joinEvent(eventId);
      return;
    }

    const entry = buildViewerWaitlistEntry(state, reason);
    const next: Event = {
      ...event,
      waitlistEntries: [...(event.waitlistEntries ?? []), entry],
      status: reason === "en_attente" ? "en_attente" : event.status,
    };
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? next : e)),
    }));
    syncEventToSheets(next);
    get().showToast(
      reason === "en_attente"
        ? "Demande envoyée — en attente de validation."
        : "Ajouté à la liste d'attente.",
    );
  },

  leaveWaitlist: (eventId) => {
    set((s) => {
      const event = s.events.find((e) => e.id === eventId);
      if (!event) return s;
      const next: Event = {
        ...event,
        waitlistEntries: stripViewerFromWaitlist(event.waitlistEntries),
        status: event.status === "en_attente" ? "inscrire" : event.status,
      };
      syncEventToSheets(next);
      return { events: s.events.map((e) => (e.id === eventId ? next : e)) };
    });
  },

  approveWaitlistEntry: (eventId, entryId) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const canManage =
      (event.status === "organisateur" &&
        (event.hostedByViewer || eventHostedByViewer(event))) ||
      state.isAdmin;
    if (!canManage) return;

    const entry = (event.waitlistEntries ?? []).find((w) => w.id === entryId);
    if (!entry || entry.reason !== "en_attente") return;
    if (event.participantCount >= event.participantMax) {
      get().showToast("Sortie complète.");
      return;
    }

    const remaining = (event.waitlistEntries ?? []).filter((w) => w.id !== entryId);
    const isViewer = entry.profilId === VIEWER_KARMA_PARTICIPANT_ID;

    if (isViewer) {
      ensureEventGroupConversation(event, set, get);
      if (!hasViewerProAccess(state)) {
        applyViewerKarma(-KARMA_JOIN_COST);
      }
    }

    set((s) => ({
      events: s.events.map((e) => {
        if (e.id !== eventId) return e;
        const paid = new Set(e.karmaJoinPaidProfilIds ?? []);
        if (isViewer && !hasViewerProAccess(s)) {
          paid.add(VIEWER_KARMA_PARTICIPANT_ID);
        }
        return {
          ...e,
          waitlistEntries: remaining,
          participantCount: Math.min(e.participantMax, e.participantCount + 1),
          status: isViewer ? ("inscrit" as const) : e.status,
          karmaJoinPaidProfilIds: isViewer ? [...paid] : e.karmaJoinPaidProfilIds,
        };
      }),
    }));
    const ev = get().events.find((e) => e.id === eventId);
    if (ev) syncEventToSheets(ev);
    get().showToast(`${entry.name.split(/\s+/)[0] || entry.name} accepté(e).`);
  },

  rejectWaitlistEntry: (eventId, entryId) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const canManage =
      (event.status === "organisateur" &&
        (event.hostedByViewer || eventHostedByViewer(event))) ||
      state.isAdmin;
    if (!canManage) return;

    const entry = (event.waitlistEntries ?? []).find((w) => w.id === entryId);
    if (!entry || entry.reason !== "en_attente") return;

    const isViewer = entry.profilId === VIEWER_KARMA_PARTICIPANT_ID;
    const remaining = (event.waitlistEntries ?? []).filter((w) => w.id !== entryId);
    const next: Event = {
      ...event,
      waitlistEntries: remaining,
      status: isViewer && event.status === "en_attente" ? "inscrire" : event.status,
    };
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? next : e)),
    }));
    syncEventToSheets(next);
    get().showToast(`Demande de ${entry.name.split(/\s+/)[0] || entry.name} refusée.`);
  },

  leaveEvent: (eventId) => {
    const state = get();
    const event = state.events.find((e) => e.id === eventId);
    if (event) {
      // Remove associated conversation
      get().leaveConversation(event.conversationId);
    }

    const paidIds = event?.karmaJoinPaidProfilIds ?? [];
    const wasValidated = (event?.validatedPresentProfilIds ?? []).includes(
      VIEWER_KARMA_PARTICIPANT_ID,
    );
    if (
      paidIds.includes(VIEWER_KARMA_PARTICIPANT_ID) &&
      !wasValidated &&
      !hasViewerProAccess(state)
    ) {
      applyViewerKarma(KARMA_JOIN_COST);
    }

    set((s) => ({
      events: s.events.map((e) => {
        if (e.id !== eventId) return e;
        const paid = (e.karmaJoinPaidProfilIds ?? []).filter(
          (id) => id !== VIEWER_KARMA_PARTICIPANT_ID,
        );
        return {
          ...e,
          waitlistEntries: stripViewerFromWaitlist(e.waitlistEntries),
          status: "inscrire" as const,
          participantCount: Math.max(0, e.participantCount - 1),
          karmaJoinPaidProfilIds: paid,
        };
      }),
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

  inviteProfilToEvent: (eventId, profilId) => {
    const state = get();
    const profile = resolveInviteProfile(
      profilId,
      state.friends,
      state.suggestions,
    );
    if (!profile) return;
    get().inviteFriendToEvent(eventId, inviteProfileToFriend(profile));
  },

  inviteProfilsToEvent: (eventId, profilIds) => {
    const unique = [...new Set(profilIds.map((id) => id.trim()).filter(Boolean))];
    let sent = 0;
    for (const profilId of unique) {
      const before = get().events.find((e) => e.id === eventId)?.invitedProfilIds
        ?.length;
      get().inviteProfilToEvent(eventId, profilId);
      const after = get().events.find((e) => e.id === eventId)?.invitedProfilIds
        ?.length;
      if (after != null && before != null && after > before) sent += 1;
    }
    if (sent > 1) {
      get().showToast(`${sent} invitations envoyées.`);
    }
  },

  loadDemoData: () => {
    if (!import.meta.env.DEV) return;
    void import("../data/mockData").then((m) => {
      set({
        events: m.MOCK_EVENTS,
        conversations: m.MOCK_CONVERSATIONS,
        messagesByConversation: m.MOCK_MESSAGES,
        friends: m.MOCK_FRIENDS,
        suggestions: m.MOCK_SUGGESTIONS,
        friendRequestRejectedProfilIds: ["u050", "u051", "u052"],
      });
    });
  },

  resetData: () => {
    set({
      events: [],
      conversations: [],
      messagesByConversation: {},
      friends: [],
      suggestions: [],
      favoriteConversationIds: [],
      friendRequestSentProfilIds: [],
      friendRequestRejectedProfilIds: [],
      friendRequestDailySentDateKey: null,
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
    syncEventReminderToSheets(reminder);
    get().showToast(`Relance envoyée à ${participantName.split(" ")[0]}`);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        get().markEventReminderAsRead(id);
      }, 4000 + Math.random() * 5000);
    }
  },
  markEventReminderAsRead: (reminderId) => {
    const current = get().eventReminders.find((r) => r.id === reminderId);
    if (!current || current.readAt != null) return;
    const updated: EventReminder = { ...current, readAt: Date.now() };
    set((state) => ({
      eventReminders: state.eventReminders.map((r) =>
        r.id === reminderId ? updated : r,
      ),
    }));
    syncEventReminderToSheets(updated);
  },
};
});
