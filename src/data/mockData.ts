/* ── Mock Data ─────────────────────────────────────────────────── */

import { buildAppSeed } from "./generateAppSeed";

// ── Types ──

export interface Event {
  id: string;
  title: string;
  location: string;
  dateKey: string; // "YYYY-MM-DD"
  timeShort: string; // "HH:MM"
  dateLabel: string; // e.g. "Lundi 23 mars"
  sectionDateLabel: string; // aligné sur `formatEventSectionTitle` (fr-FR, ex. "Lundi 23 mars 2026")
  imageUri: string;
  priceLabel: string;
  participantCount: number;
  participantMax: number;
  isFavorite: boolean;
  isBeta: boolean;
  status: "inscrit" | "inscrire" | "organisateur" | "en_attente";
  notes?: string;
  conversationId: string;
  visitsCount?: number;
  category: string;
  hostName: string;
  hostAvatar: string;
  /** Photos empilées sur la carte (max 3). */
  participantAvatars?: string[];
  price: string;
  /** Options création (meetabit). */
  hideAddress?: boolean;
  /** Hors agenda public sauf organisateur, inscrits et mode admin nel. */
  isPrivate?: boolean;
  manualApproval?: boolean;
  /** Sortie créée depuis nel : hôte = profil visiteur (photo / prénom suivis en direct). */
  hostedByViewer?: boolean; /** Identifiant du créateur de l'event (pour visibility des privés). */
  creatorId?: string; /**
   * File d’attente : demandes non validées (`en_attente` si validation manuelle)
   * ou inscrits au-delà de la capacité (`overflow`).
   */
  waitlistEntries?: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    profilId?: string;
    reason: "en_attente" | "overflow";
  }>;
  /** Amis à qui l’organisateur a envoyé une invitation (démo nel + filtre doublons). */
  invitedProfilIds?: string[];
  /** Lien public HappyLetsGo (ex. https://happyletsgo.fr/event/…). */
  publicUrl?: string;
  /** Participants validés présents par l’organisateur (`__viewer__` = profil connecté). */
  validatedPresentProfilIds?: string[];
  /** Karma organisateur (+6) déjà attribué pour cette sortie. */
  karmaOrganizerRewarded?: boolean;
  /** Bonus karma organisateur refusé (majorité de notes négatives). */
  karmaOrganizerDenied?: boolean;
  /** Notes des participants présents sur l'organisateur. */
  organizerRatings?: Array<{ profilId: string; rating: "good" | "bad" }>;
  /** Profils ayant payé 1 karma pour participer. */
  karmaJoinPaidProfilIds?: string[];
  /** 3 karma débités à la création (remboursables si annulation). */
  karmaOrganizePaid?: boolean;
}

/** Notification in-app (centre Profil — démo). */
/** Relance envoyée par l’organisateur à un participant (onglet `event_reminders`). */
export interface EventReminder {
  id: string;
  eventId: string;
  eventTitle: string;
  participantId: string;
  participantName: string;
  sentAt: number;
  readAt?: number;
}

export type WaitlistEntry = NonNullable<Event["waitlistEntries"]>[number];

export interface AppNotification {
  id: string;
  createdAt: number;
  kind: "event_invite_sent" | "chat_message";
  eventId?: string;
  eventTitle?: string;
  inviteeName?: string;
  inviteeProfilId?: string;
  conversationId?: string;
  senderName?: string;
  messagePreview?: string;
}

/** Signalement utilisateur → file admin (onglet Profil — démo). */
export interface AdminReportEntry {
  id: string;
  createdAt: number;
  kind: "profile" | "event" | "suspicious_login";
  /** `profilId` ou id de sortie. */
  subjectId: string;
  subjectLabel: string;
  explanation: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  type: "dm" | "group";
  lastMessagePreview: string;
  avatarGradient: readonly [string, string];
  unreadCount: number;
  updatedAt: number;
  /** Dernière ouverture du fil (salle de chat) — pour tri favoris « dernier ouvert ». */
  lastOpenedAt?: number;
  isFavorite: boolean;
  members: GroupMember[];
  memberCount?: number;
  muteSounds?: boolean;
  blockNotifications?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  authorName: string;
  text: string;
  sentAt: number;
  isOwn: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  avatarGradient: readonly [string, string];
  isSelf: boolean;
  profilId?: string;
  /** Photo directe (ex. pro hors annuaire amis). */
  avatarUrl?: string;
}

export interface ProfileVisit {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  lastVisitAt: number;
  visitMultiplier?: number;
  friendRequest: boolean;
}

export interface SuggestionProfile {
  id: string;
  pseudo: string;
  age: number;
  imageUrl: string;
  aspectRatio: number;
}

export interface Friend {
  profilId: string;
  /** Nom affiché (cartes, listes). */
  name: string;
  age: number | null;
  city: string;
  imageUrl: string;
  /** Sorties en commun avec le profil connecté (toi). */
  eventsInCommon: number;
  /** Fil privé nel avec toi — ouvre le bon chat depuis « Message ». */
  mainChatConversationId: string;
  pseudo?: string;
  bio?: string;
  memberSince?: string;
  verified?: boolean;
  isPro?: boolean;
  /** Adresse cabinet (pro) — affichée sur la carte et le profil. */
  proAddress?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  stats?: { reliability: number; events: number; friends: number };
  badges?: string[];
  /** Ami mutuel confirmé (cœur dans Suggestions) — sinon profil connu / suggestion. */
  mutualFriend?: boolean;
  /** Points karma (défaut 5). */
  karma?: number;
}

const _appSeed = buildAppSeed();

/** 56 sorties sur 14 jours glissants (4/j), dates réelles + listes d’attente aléatoires (seed fixe). */
export const MOCK_EVENTS: Event[] = _appSeed.events;

/** 99 fils : 56 groupes sorties + 38 DM + 5 DM (f1–f5). */
export const MOCK_CONVERSATIONS: Conversation[] = _appSeed.conversations;

export const MOCK_MESSAGES: Record<string, Message[]> = _appSeed.messages;

/** 99 profils complets (f1–f5 + u006–u099) — onglet Amis & fiches profil. */
export const MOCK_FRIENDS: Friend[] = _appSeed.friends;

export const MOCK_VISITS: ProfileVisit[] = _appSeed.friends
  .slice(40, 52)
  .map((f, i) => ({
    id: f.profilId,
    name: f.pseudo || f.name.split(" ")[0],
    age: f.age ?? 25,
    avatarUrl: f.imageUrl,
    lastVisitAt: Date.now() - (i + 1) * 90_000,
    friendRequest: i % 5 === 0,
    visitMultiplier: (i % 4) + 1,
  }));

/** Grille Suggestions : tout le monde (y compris les profils déjà dans « Amis »). */
export const MOCK_SUGGESTIONS: SuggestionProfile[] = _appSeed.friends.map(
  (f, i) => ({
    id: f.profilId,
    pseudo: f.pseudo || f.name.split(" ")[0],
    age: f.age ?? 26,
    imageUrl: f.imageUrl,
    aspectRatio: Math.round((0.62 + (i % 11) * 0.07) * 100) / 100,
  }),
);

// ── Helpers ──
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export function formatVisitTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export function formatBadgeCount(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

export function formatSuggestionCaption(pseudo: string, age: number): string {
  return `${pseudo}, ${age}`;
}
