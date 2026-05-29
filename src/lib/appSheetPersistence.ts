/**
 * Persistance applicative : événements, profils, conversations, etc.
 * CSV local (cache) + Google Sheets (POST nouvelles lignes, PUT mises à jour).
 */

import type {
  AdminReportEntry,
  AppNotification,
  Conversation,
  Event,
  Friend,
  GroupMember,
  ProfileVisit,
  SuggestionProfile,
} from "../data/mockData";
import type { MockProfessional } from "../data/mockProfessionals";
import { MOCK_PROFESSIONALS } from "../data/mockProfessionals";
import { proCoordinates } from "./proCoordinates";
import {
  isGoogleSheetsReadConfigured,
  isGoogleSheetsWriteConfigured,
  sheetGet,
  sheetPost,
  sheetPut,
  type SheetTableName,
} from "./googleSheetsDb";
import {
  boolFromSheet,
  boolToSheet,
  jsonFromSheet,
  jsonToSheet,
  numFromSheet,
  str,
} from "./sheetRowCodec";

const LS_CACHE_PREFIX = "nel_sheet_cache_";
const syncedRowKeys = new Set<string>();

function cacheKey(table: SheetTableName, userId: string): string {
  return `${LS_CACHE_PREFIX}${table}_${userId}`;
}

function rowKey(table: SheetTableName, id: string): string {
  return `${table}:${id}`;
}

function markSynced(table: SheetTableName, id: string): void {
  syncedRowKeys.add(rowKey(table, id));
}

function isSynced(table: SheetTableName, id: string): boolean {
  return syncedRowKeys.has(rowKey(table, id));
}

function saveLocalCache(table: SheetTableName, userId: string, rows: Record<string, string>[]): void {
  try {
    localStorage.setItem(cacheKey(table, userId), JSON.stringify(rows));
  } catch {
    /* ignore quota */
  }
}

function loadLocalCache(table: SheetTableName, userId: string): Record<string, string>[] {
  try {
    const raw = localStorage.getItem(cacheKey(table, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, string>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowsForUser(rows: Record<string, string>[], userId: string): Record<string, string>[] {
  return rows.filter((r) => r.userId === userId && r.deleted !== "true");
}

async function readTable(table: SheetTableName, userId: string): Promise<Record<string, string>[]> {
  if (isGoogleSheetsReadConfigured()) {
    try {
      const rows = await sheetGet<Record<string, string>>(table);
      const mine = rowsForUser(rows, userId);
      saveLocalCache(table, userId, mine);
      mine.forEach((r) => {
        const id = r.id ?? r.profilId ?? r.userId;
        if (id) markSynced(table, id);
      });
      return mine;
    } catch (err) {
      console.error(`Sheets read [${table}] failed, fallback cache:`, err);
    }
  }
  const cached = loadLocalCache(table, userId);
  cached.forEach((r) => {
    const id = r.id ?? r.profilId ?? r.userId;
    if (id) markSynced(table, id);
  });
  return cached;
}

/** POST si nouvelle ligne, PUT si déjà synchronisée (ou déjà présente côté Sheet). */
export async function upsertSheetRow(
  table: SheetTableName,
  id: string,
  row: Record<string, string>,
  idColumn = "id",
): Promise<void> {
  const fullRow = { ...row, [idColumn]: id, deleted: row.deleted ?? "false" };

  const cacheUserId = row.userId;
  if (cacheUserId) {
    const cached = loadLocalCache(table, cacheUserId);
    const idx = cached.findIndex((r) => r[idColumn] === id);
    const next = idx >= 0 ? cached.map((r, i) => (i === idx ? fullRow : r)) : [...cached, fullRow];
    saveLocalCache(table, cacheUserId, next);
  }

  if (!isGoogleSheetsWriteConfigured()) return;

  try {
    if (isSynced(table, id)) {
      await sheetPut(table, id, fullRow);
      return;
    }
    await sheetPost(table, fullRow);
    markSynced(table, id);
  } catch (postErr) {
    try {
      await sheetPut(table, id, fullRow);
      markSynced(table, id);
    } catch (putErr) {
      console.error(`Sheets upsert [${table}] ${id}:`, postErr, putErr);
    }
  }
}

export async function softDeleteSheetRow(
  table: SheetTableName,
  userId: string,
  id: string,
  idColumn = "id",
): Promise<void> {
  await upsertSheetRow(table, id, { userId, deleted: "true" }, idColumn);
}

// ── Event ────────────────────────────────────────────────────────────────

export function eventToRow(event: Event, userId: string): Record<string, string> {
  return {
    userId,
    id: event.id,
    conversationId: event.conversationId,
    title: event.title,
    location: event.location,
    dateKey: event.dateKey,
    timeShort: event.timeShort,
    dateLabel: event.dateLabel,
    sectionDateLabel: event.sectionDateLabel,
    imageUri: event.imageUri,
    priceLabel: event.priceLabel,
    price: event.price,
    participantCount: String(event.participantCount),
    participantMax: String(event.participantMax),
    isFavorite: boolToSheet(event.isFavorite),
    isBeta: boolToSheet(event.isBeta),
    status: event.status,
    notes: event.notes ?? "",
    visitsCount: String(event.visitsCount ?? 0),
    category: event.category,
    hostName: event.hostName,
    hostAvatar: event.hostAvatar,
    hideAddress: boolToSheet(event.hideAddress),
    isPrivate: boolToSheet(event.isPrivate),
    manualApproval: boolToSheet(event.manualApproval),
    hostedByViewer: boolToSheet(event.hostedByViewer),
    creatorId: event.creatorId ?? "",
    waitlistEntriesJson: jsonToSheet(event.waitlistEntries ?? []),
    invitedProfilIdsJson: jsonToSheet(event.invitedProfilIds ?? []),
    deleted: "false",
  };
}

export function rowToEvent(row: Record<string, string>): Event {
  return {
    id: row.id,
    conversationId: row.conversationId,
    title: row.title,
    location: row.location,
    dateKey: row.dateKey,
    timeShort: row.timeShort || "10:00",
    dateLabel: row.dateLabel,
    sectionDateLabel: row.sectionDateLabel,
    imageUri: row.imageUri,
    priceLabel: row.priceLabel || "Gratuit",
    price: row.price || row.priceLabel || "Gratuit",
    participantCount: numFromSheet(row.participantCount, 1),
    participantMax: numFromSheet(row.participantMax, 50),
    isFavorite: boolFromSheet(row.isFavorite),
    isBeta: boolFromSheet(row.isBeta),
    status: (row.status as Event["status"]) || "inscrire",
    notes: row.notes?.trim() || undefined,
    visitsCount: numFromSheet(row.visitsCount, 0),
    category: row.category || "Sortie",
    hostName: row.hostName || "Organisateur",
    hostAvatar: row.hostAvatar || "",
    hideAddress: boolFromSheet(row.hideAddress),
    isPrivate: boolFromSheet(row.isPrivate),
    manualApproval: boolFromSheet(row.manualApproval),
    hostedByViewer: boolFromSheet(row.hostedByViewer),
    creatorId: row.creatorId?.trim() || undefined,
    waitlistEntries: jsonFromSheet(row.waitlistEntriesJson, []),
    invitedProfilIds: jsonFromSheet(row.invitedProfilIdsJson, []),
  };
}

// ── Conversation ───────────────────────────────────────────────────────────

export function conversationToRow(conv: Conversation, userId: string): Record<string, string> {
  return {
    userId,
    id: conv.id,
    title: conv.title,
    type: conv.type,
    lastMessagePreview: conv.lastMessagePreview,
    avatarGradient0: conv.avatarGradient[0],
    avatarGradient1: conv.avatarGradient[1],
    unreadCount: String(conv.unreadCount),
    updatedAt: String(conv.updatedAt),
    lastOpenedAt: conv.lastOpenedAt != null ? String(conv.lastOpenedAt) : "",
    isFavorite: boolToSheet(conv.isFavorite),
    memberCount: String(conv.memberCount ?? conv.members.length),
    muteSounds: boolToSheet(conv.muteSounds),
    blockNotifications: boolToSheet(conv.blockNotifications),
    membersJson: jsonToSheet(conv.members),
    deleted: "false",
  };
}

export function rowToConversation(row: Record<string, string>): Conversation {
  const members = jsonFromSheet<GroupMember[]>(row.membersJson, []);
  return {
    id: row.id,
    title: row.title,
    type: (row.type as Conversation["type"]) || "group",
    lastMessagePreview: row.lastMessagePreview ?? "",
    avatarGradient: [
      row.avatarGradient0 || "#9B5DE5",
      row.avatarGradient1 || "#C23B8E",
    ] as [string, string],
    unreadCount: numFromSheet(row.unreadCount, 0),
    updatedAt: numFromSheet(row.updatedAt, Date.now()),
    lastOpenedAt: row.lastOpenedAt ? numFromSheet(row.lastOpenedAt) : undefined,
    isFavorite: boolFromSheet(row.isFavorite),
    memberCount: numFromSheet(row.memberCount, members.length),
    muteSounds: boolFromSheet(row.muteSounds),
    blockNotifications: boolFromSheet(row.blockNotifications),
    members,
  };
}

// ── Friend / profile ───────────────────────────────────────────────────────

export function friendToRow(friend: Friend, userId: string): Record<string, string> {
  return {
    userId,
    id: friend.profilId,
    profilId: friend.profilId,
    name: friend.name,
    age: friend.age != null ? String(friend.age) : "",
    city: friend.city,
    imageUrl: friend.imageUrl,
    eventsInCommon: String(friend.eventsInCommon),
    mainChatConversationId: friend.mainChatConversationId,
    pseudo: friend.pseudo ?? "",
    bio: friend.bio ?? "",
    memberSince: friend.memberSince ?? "",
    verified: boolToSheet(friend.verified),
    isPro: boolToSheet(friend.isPro),
    websiteUrl: str(friend.websiteUrl),
    socialUrl: str(friend.socialUrl),
    phone: str(friend.phone),
    statsJson: jsonToSheet(friend.stats ?? null),
    badgesJson: jsonToSheet(friend.badges ?? []),
    mutualFriend: boolToSheet(friend.mutualFriend),
    deleted: "false",
  };
}

export function rowToFriend(row: Record<string, string>): Friend {
  const ageRaw = row.age?.trim();
  return {
    profilId: row.profilId || row.id,
    name: row.name,
    age: ageRaw ? numFromSheet(ageRaw) : null,
    city: row.city ?? "",
    imageUrl: row.imageUrl,
    eventsInCommon: numFromSheet(row.eventsInCommon, 0),
    mainChatConversationId: row.mainChatConversationId,
    pseudo: row.pseudo?.trim() || undefined,
    bio: row.bio?.trim() || undefined,
    memberSince: row.memberSince?.trim() || undefined,
    verified: boolFromSheet(row.verified),
    isPro: boolFromSheet(row.isPro),
    websiteUrl: str(row.websiteUrl) || undefined,
    socialUrl: str(row.socialUrl) || undefined,
    phone: str(row.phone) || undefined,
    stats: jsonFromSheet(row.statsJson, undefined as Friend["stats"]),
    badges: jsonFromSheet(row.badgesJson, undefined as string[] | undefined),
    mutualFriend: boolFromSheet(row.mutualFriend),
  };
}

// ── Professional directory (global) ───────────────────────────────────────────

function professionalToRow(p: MockProfessional): Record<string, string> {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    category: p.category,
    categoryLabel: p.categoryLabel,
    city: p.city,
    description: p.description,
    imageUrl: p.imageUrl,
    mapX: String(p.mapX),
    mapY: String(p.mapY),
    lat: String(p.lat ?? proCoordinates(p).lat),
    lng: String(p.lng ?? proCoordinates(p).lng),
    verified: boolToSheet(p.verified),
    websiteUrl: str(p.websiteUrl),
    socialUrl: str(p.socialUrl),
    phone: str(p.phone),
    deleted: "false",
  };
}

function rowToProfessional(row: Record<string, string>): MockProfessional {
  const id = str(row.id);
  const fallback = MOCK_PROFESSIONALS.find((p) => p.id === id);
  const mapX = numFromSheet(row.mapX, fallback?.mapX ?? 50);
  const mapY = numFromSheet(row.mapY, fallback?.mapY ?? 50);
  const city = str(row.city) || fallback?.city || "";
  const partial = {
    id,
    firstName: str(row.firstName) || fallback?.firstName || "",
    lastName: str(row.lastName) || fallback?.lastName || "",
    category: (str(row.category) || fallback?.category || "therapeute") as MockProfessional["category"],
    categoryLabel: str(row.categoryLabel) || fallback?.categoryLabel || "",
    city,
    description: str(row.description) || fallback?.description || "",
    imageUrl: str(row.imageUrl) || fallback?.imageUrl || "",
    mapX,
    mapY,
    lat: str(row.lat) ? numFromSheet(row.lat) : fallback?.lat,
    lng: str(row.lng) ? numFromSheet(row.lng) : fallback?.lng,
    verified: row.verified != null ? boolFromSheet(row.verified) : fallback?.verified,
    websiteUrl: str(row.websiteUrl) || fallback?.websiteUrl,
    socialUrl: str(row.socialUrl) || fallback?.socialUrl,
    phone: str(row.phone) || fallback?.phone,
  };
  const coords = proCoordinates(partial);
  return { ...partial, lat: coords.lat, lng: coords.lng };
}

// ── Suggestion ─────────────────────────────────────────────────────────────

export function suggestionToRow(s: SuggestionProfile, userId: string): Record<string, string> {
  return {
    userId,
    id: s.id,
    pseudo: s.pseudo,
    age: String(s.age),
    imageUrl: s.imageUrl,
    aspectRatio: String(s.aspectRatio),
    deleted: "false",
  };
}

export function rowToSuggestion(row: Record<string, string>): SuggestionProfile {
  return {
    id: row.id,
    pseudo: row.pseudo,
    age: numFromSheet(row.age, 25),
    imageUrl: row.imageUrl,
    aspectRatio: parseFloat(row.aspectRatio) || 0.75,
  };
}

// ── Profile visit ──────────────────────────────────────────────────────────

export function visitToRow(v: ProfileVisit, userId: string): Record<string, string> {
  return {
    userId,
    id: v.id,
    name: v.name,
    age: String(v.age),
    avatarUrl: v.avatarUrl,
    lastVisitAt: String(v.lastVisitAt),
    visitMultiplier: v.visitMultiplier != null ? String(v.visitMultiplier) : "",
    friendRequest: boolToSheet(v.friendRequest),
    deleted: "false",
  };
}

export function rowToVisit(row: Record<string, string>): ProfileVisit {
  return {
    id: row.id,
    name: row.name,
    age: numFromSheet(row.age, 25),
    avatarUrl: row.avatarUrl,
    lastVisitAt: numFromSheet(row.lastVisitAt, Date.now()),
    visitMultiplier: row.visitMultiplier ? numFromSheet(row.visitMultiplier) : undefined,
    friendRequest: boolFromSheet(row.friendRequest),
  };
}

// ── Viewer settings ────────────────────────────────────────────────────────

export interface ViewerSettingsRow {
  userId: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string;
  displayName: string;
  isPro: boolean;
  city?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  friendRequestSentJson: string;
  friendRequestRejectedJson: string;
  favoriteConversationIdsJson: string;
  moderationHiddenEventIdsJson: string;
  moderationHiddenProfilIdsJson: string;
}

export function viewerSettingsToRow(
  userId: string,
  data: {
    email?: string;
    emailVerified?: boolean;
    avatarUrl: string;
    displayName: string;
    isPro: boolean;
    city?: string;
    websiteUrl?: string;
    socialUrl?: string;
    phone?: string;
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    favoriteConversationIds: string[];
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
  },
): Record<string, string> {
  return {
    userId,
    id: userId,
    email: data.email ?? "",
    emailVerified: boolToSheet(data.emailVerified),
    avatarUrl: data.avatarUrl,
    displayName: data.displayName,
    isPro: boolToSheet(data.isPro),
    city: str(data.city),
    websiteUrl: str(data.websiteUrl),
    socialUrl: str(data.socialUrl),
    phone: str(data.phone),
    friendRequestSentJson: jsonToSheet(data.friendRequestSentProfilIds),
    friendRequestRejectedJson: jsonToSheet(data.friendRequestRejectedProfilIds),
    favoriteConversationIdsJson: jsonToSheet(data.favoriteConversationIds),
    moderationHiddenEventIdsJson: jsonToSheet(data.moderationHiddenEventIds),
    moderationHiddenProfilIdsJson: jsonToSheet(data.moderationHiddenProfilIds),
    deleted: "false",
  };
}

// ── Notification / report ──────────────────────────────────────────────────

export function notificationToRow(n: AppNotification, userId: string): Record<string, string> {
  return {
    userId,
    id: n.id,
    createdAt: String(n.createdAt),
    kind: n.kind,
    eventId: n.eventId ?? "",
    eventTitle: n.eventTitle ?? "",
    inviteeName: n.inviteeName ?? "",
    inviteeProfilId: n.inviteeProfilId ?? "",
    conversationId: n.conversationId ?? "",
    senderName: n.senderName ?? "",
    messagePreview: n.messagePreview ?? "",
    deleted: "false",
  };
}

export function rowToNotification(row: Record<string, string>): AppNotification {
  return {
    id: row.id,
    createdAt: numFromSheet(row.createdAt, Date.now()),
    kind: row.kind as AppNotification["kind"],
    eventId: row.eventId?.trim() || undefined,
    eventTitle: row.eventTitle?.trim() || undefined,
    inviteeName: row.inviteeName?.trim() || undefined,
    inviteeProfilId: row.inviteeProfilId?.trim() || undefined,
    conversationId: row.conversationId?.trim() || undefined,
    senderName: row.senderName?.trim() || undefined,
    messagePreview: row.messagePreview?.trim() || undefined,
  };
}

export function reportToRow(r: AdminReportEntry, userId: string): Record<string, string> {
  return {
    userId,
    id: r.id,
    createdAt: String(r.createdAt),
    kind: r.kind,
    subjectId: r.subjectId,
    subjectLabel: r.subjectLabel,
    explanation: r.explanation,
    read: boolToSheet(r.read),
    deleted: "false",
  };
}

export function rowToReport(row: Record<string, string>): AdminReportEntry {
  return {
    id: row.id,
    createdAt: numFromSheet(row.createdAt, Date.now()),
    kind: row.kind as AdminReportEntry["kind"],
    subjectId: row.subjectId,
    subjectLabel: row.subjectLabel,
    explanation: row.explanation,
    read: boolFromSheet(row.read),
  };
}

// ── Load / sync API ────────────────────────────────────────────────────────

export interface LoadedAppSheetState {
  events: Event[];
  conversations: Conversation[];
  friends: Friend[];
  suggestions: SuggestionProfile[];
  profileVisits: ProfileVisit[];
  appNotifications: AppNotification[];
  adminReports: AdminReportEntry[];
  professionals: MockProfessional[];
  viewerSettings?: {
    email: string;
    emailVerified: boolean;
    avatarUrl: string;
    displayName: string;
    isPro: boolean;
    city?: string;
    websiteUrl?: string;
    socialUrl?: string;
    phone?: string;
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    favoriteConversationIds: string[];
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
  };
  hasRemoteData: boolean;
}

function mergeById<T extends { id: string }>(base: T[], remote: T[]): T[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((item) => [item.id, item]));
  remote.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function mergeFriends(base: Friend[], remote: Friend[]): Friend[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((f) => [f.profilId, f]));
  remote.forEach((f) => map.set(f.profilId, f));
  return [...map.values()];
}

const GLOBAL_CACHE_USER = "__global__";

async function readGlobalTable(table: SheetTableName): Promise<Record<string, string>[]> {
  if (isGoogleSheetsReadConfigured()) {
    try {
      const rows = await sheetGet<Record<string, string>>(table);
      const active = rows.filter((r) => r.deleted !== "true");
      saveLocalCache(table, GLOBAL_CACHE_USER, active);
      active.forEach((r) => {
        const id = r.id;
        if (id) markSynced(table, id);
      });
      return active;
    } catch (err) {
      console.error(`Sheets read [${table}] failed, fallback cache:`, err);
    }
  }
  const cached = loadLocalCache(table, GLOBAL_CACHE_USER);
  cached.forEach((r) => {
    const id = r.id;
    if (id) markSynced(table, id);
  });
  return cached;
}

function mergeProfessionals(
  base: MockProfessional[],
  remote: MockProfessional[],
): MockProfessional[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((p) => [p.id, p]));
  remote.forEach((p) => {
    const prev = map.get(p.id);
    map.set(p.id, prev ? { ...prev, ...p } : p);
  });
  return [...map.values()];
}

export async function loadAppStateFromSheets(userId: string): Promise<LoadedAppSheetState> {
  const [
    eventRows,
    convRows,
    profileRows,
    suggestionRows,
    visitRows,
    viewerRows,
    notifRows,
    reportRows,
    professionalRows,
  ] = await Promise.all([
    readTable("events", userId),
    readTable("conversations", userId),
    readTable("profiles", userId),
    readTable("suggestions", userId),
    readTable("profile_visits", userId),
    readTable("viewer_settings", userId),
    readTable("notifications", userId),
    readTable("admin_reports", userId),
    readGlobalTable("professionals"),
  ]);

  const viewerRow = viewerRows[0];
  const hasRemoteData =
    eventRows.length > 0 ||
    convRows.length > 0 ||
    profileRows.length > 0 ||
    suggestionRows.length > 0 ||
    visitRows.length > 0 ||
    viewerRow != null ||
    notifRows.length > 0 ||
    reportRows.length > 0 ||
    professionalRows.length > 0;

  const professionals =
    professionalRows.length > 0
      ? professionalRows.map(rowToProfessional)
      : MOCK_PROFESSIONALS;

  return {
    events: eventRows.map(rowToEvent),
    conversations: convRows.map(rowToConversation),
    friends: profileRows.map(rowToFriend),
    suggestions: suggestionRows.map(rowToSuggestion),
    profileVisits: visitRows.map(rowToVisit),
    appNotifications: notifRows.map(rowToNotification),
    adminReports: reportRows.map(rowToReport),
    professionals,
    viewerSettings: viewerRow
      ? {
          email: viewerRow.email ?? "",
          emailVerified: boolFromSheet(viewerRow.emailVerified),
          avatarUrl: viewerRow.avatarUrl ?? "",
          displayName: viewerRow.displayName ?? "",
          isPro: boolFromSheet(viewerRow.isPro),
          city: str(viewerRow.city) || undefined,
          websiteUrl: str(viewerRow.websiteUrl) || undefined,
          socialUrl: str(viewerRow.socialUrl) || undefined,
          phone: str(viewerRow.phone) || undefined,
          friendRequestSentProfilIds: jsonFromSheet(viewerRow.friendRequestSentJson, []),
          friendRequestRejectedProfilIds: jsonFromSheet(viewerRow.friendRequestRejectedJson, []),
          favoriteConversationIds: jsonFromSheet(viewerRow.favoriteConversationIdsJson, []),
          moderationHiddenEventIds: jsonFromSheet(viewerRow.moderationHiddenEventIdsJson, []),
          moderationHiddenProfilIds: jsonFromSheet(viewerRow.moderationHiddenProfilIdsJson, []),
        }
      : undefined,
    hasRemoteData,
  };
}

export function mergeLoadedAppState(
  current: {
    events: Event[];
    conversations: Conversation[];
    friends: Friend[];
    suggestions: SuggestionProfile[];
    profileVisits: ProfileVisit[];
    appNotifications: AppNotification[];
    adminReports: AdminReportEntry[];
    favoriteConversationIds: string[];
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
  },
  loaded: LoadedAppSheetState,
): Partial<typeof current> & {
  viewerProfileAvatarUrl?: string;
  viewerProfileDisplayName?: string;
  viewerProfileIsPro?: boolean;
  viewerProfileCity?: string;
  viewerProWebsiteUrl?: string;
  viewerProSocialUrl?: string;
  viewerProPhone?: string;
} {
  const patch: Partial<typeof current> & {
    viewerProfileAvatarUrl?: string;
    viewerProfileDisplayName?: string;
    viewerProfileIsPro?: boolean;
    viewerProWebsiteUrl?: string;
    viewerProSocialUrl?: string;
    viewerProPhone?: string;
  } = {};

  if (loaded.events.length > 0) {
    patch.events = mergeById(current.events, loaded.events);
  }
  if (loaded.conversations.length > 0) {
    patch.conversations = mergeById(current.conversations, loaded.conversations);
  }
  if (loaded.friends.length > 0) {
    patch.friends = mergeFriends(current.friends, loaded.friends);
  }
  if (loaded.suggestions.length > 0) {
    patch.suggestions = mergeById(current.suggestions, loaded.suggestions);
  }
  if (loaded.profileVisits.length > 0) {
    patch.profileVisits = mergeById(current.profileVisits, loaded.profileVisits);
  }
  if (loaded.appNotifications.length > 0) {
    patch.appNotifications = mergeById(current.appNotifications, loaded.appNotifications);
  }
  if (loaded.adminReports.length > 0) {
    patch.adminReports = mergeById(current.adminReports, loaded.adminReports);
  }

  if (loaded.viewerSettings) {
    const vs = loaded.viewerSettings;
    if (vs.avatarUrl) patch.viewerProfileAvatarUrl = vs.avatarUrl;
    if (vs.displayName) patch.viewerProfileDisplayName = vs.displayName;
    patch.viewerProfileIsPro = vs.isPro;
    if (vs.city != null) patch.viewerProfileCity = vs.city;
    if (vs.websiteUrl != null) patch.viewerProWebsiteUrl = vs.websiteUrl;
    if (vs.socialUrl != null) patch.viewerProSocialUrl = vs.socialUrl;
    if (vs.phone != null) patch.viewerProPhone = vs.phone;
    if (vs.friendRequestSentProfilIds.length > 0) {
      patch.friendRequestSentProfilIds = vs.friendRequestSentProfilIds;
    }
    if (vs.friendRequestRejectedProfilIds.length > 0) {
      patch.friendRequestRejectedProfilIds = vs.friendRequestRejectedProfilIds;
    }
    if (vs.favoriteConversationIds.length > 0) {
      patch.favoriteConversationIds = vs.favoriteConversationIds;
    }
    if (vs.moderationHiddenEventIds.length > 0) {
      patch.moderationHiddenEventIds = vs.moderationHiddenEventIds;
    }
    if (vs.moderationHiddenProfilIds.length > 0) {
      patch.moderationHiddenProfilIds = vs.moderationHiddenProfilIds;
    }
  }

  return patch;
}

// ── Sync helpers (appelés depuis le store) ─────────────────────────────────

function currentUserId(): string | null {
  try {
    const raw = localStorage.getItem("nel_auth_user");
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string };
    return user.id?.trim() || null;
  } catch {
    return null;
  }
}

function syncLater(fn: () => Promise<void>): void {
  void fn().catch((err) => console.error("Sheet sync error:", err));
}

export function syncEventToSheets(event: Event): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("events", event.id, eventToRow(event, userId)));
}

export function syncEventDeleteToSheets(eventId: string): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => softDeleteSheetRow("events", userId, eventId));
}

export function syncConversationToSheets(conv: Conversation): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("conversations", conv.id, conversationToRow(conv, userId)));
}

export function syncConversationDeleteToSheets(conversationId: string): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => softDeleteSheetRow("conversations", userId, conversationId));
}

export function syncFriendToSheets(friend: Friend): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() =>
    upsertSheetRow("profiles", friend.profilId, friendToRow(friend, userId), "id"),
  );
}

export function syncViewerSettingsToSheets(data: {
  email?: string;
  emailVerified?: boolean;
  avatarUrl: string;
  displayName: string;
  isPro: boolean;
  city?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  friendRequestSentProfilIds: string[];
  friendRequestRejectedProfilIds: string[];
  favoriteConversationIds: string[];
  moderationHiddenEventIds: string[];
  moderationHiddenProfilIds: string[];
}): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() =>
    upsertSheetRow("viewer_settings", userId, viewerSettingsToRow(userId, data)),
  );
}

export function syncNotificationToSheets(n: AppNotification): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("notifications", n.id, notificationToRow(n, userId)));
}

export function syncReportToSheets(r: AdminReportEntry): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("admin_reports", r.id, reportToRow(r, userId)));
}

export function syncReportDeleteToSheets(reportId: string): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => softDeleteSheetRow("admin_reports", userId, reportId));
}

export function syncAllViewerStateFromStore(state: {
  email?: string;
  emailVerified?: boolean;
  viewerProfileAvatarUrl: string;
  viewerProfileDisplayName: string;
  viewerProfileIsPro: boolean;
  viewerProfileCity?: string;
  viewerProWebsiteUrl?: string;
  viewerProSocialUrl?: string;
  viewerProPhone?: string;
  friendRequestSentProfilIds: string[];
  friendRequestRejectedProfilIds: string[];
  favoriteConversationIds: string[];
  moderationHiddenEventIds: string[];
  moderationHiddenProfilIds: string[];
}): void {
  syncViewerSettingsToSheets({
    email: state.email,
    emailVerified: state.emailVerified,
    avatarUrl: state.viewerProfileAvatarUrl,
    displayName: state.viewerProfileDisplayName,
    isPro: state.viewerProfileIsPro,
    city: state.viewerProfileCity,
    websiteUrl: state.viewerProWebsiteUrl,
    socialUrl: state.viewerProSocialUrl,
    phone: state.viewerProPhone,
    friendRequestSentProfilIds: state.friendRequestSentProfilIds,
    friendRequestRejectedProfilIds: state.friendRequestRejectedProfilIds,
    favoriteConversationIds: state.favoriteConversationIds,
    moderationHiddenEventIds: state.moderationHiddenEventIds,
    moderationHiddenProfilIds: state.moderationHiddenProfilIds,
  });
}

/** Après vérification email — sync Sheets sans dépendre du store messaging. */
export function syncEmailVerifiedToSheets(
  userId: string,
  email: string,
  displayName: string,
  avatarUrl: string,
  isPro: boolean,
  websiteUrl?: string,
  socialUrl?: string,
  phone?: string,
): void {
  syncLater(() =>
    upsertSheetRow(
      "viewer_settings",
      userId,
      viewerSettingsToRow(userId, {
        email,
        emailVerified: true,
        avatarUrl,
        displayName,
        isPro,
        websiteUrl,
        socialUrl,
        phone,
        friendRequestSentProfilIds: [],
        friendRequestRejectedProfilIds: [],
        favoriteConversationIds: [],
        moderationHiddenEventIds: [],
        moderationHiddenProfilIds: [],
      }),
    ),
  );
}

export function syncProfessionalToSheets(pro: MockProfessional): void {
  syncLater(() => upsertSheetRow("professionals", pro.id, professionalToRow(pro)));
}

export function syncProfessionalsToSheets(professionals: MockProfessional[]): void {
  if (!isGoogleSheetsWriteConfigured()) return;
  syncLater(async () => {
    for (const pro of professionals) {
      await upsertSheetRow("professionals", pro.id, professionalToRow(pro));
    }
  });
}

export { mergeProfessionals };
