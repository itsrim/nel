/**
 * Persistance applicative : événements, profils, conversations, etc.
 * CSV local (cache) + Google Sheets (POST nouvelles lignes, PUT mises à jour).
 */

import type {
  AdminReportEntry,
  AppNotification,
  Conversation,
  Event,
  EventReminder,
  Friend,
  GroupMember,
  ProfileVisit,
  SuggestionProfile,
} from "../data/mockData";
import type { MockProfessional } from "../data/mockProfessionals";
import type { SubscriptionPaymentRecord } from "./subscriptionPersistence";
import { parseUserBadgeLastSeen } from "./userBadges";
import { resolveAvatarUrl } from "./avatarUrl";
import { filterOutSelfFriends, isSelfProfilId } from "./friendGuards";
import { buildEventPublicUrl, resolveEventPublicUrl } from "./eventPublicUrl";
import { proCoordinates } from "./proCoordinates";
import {
  isGoogleSheetsReadConfigured,
  isGoogleSheetsWriteConfigured,
  sheetGet,
  sheetMutate,
  sheetPost,
  sheetPut,
  type SheetTableName,
} from "./googleSheetsDb";
import {
  boolFromSheet,
  isDeletedFromSheet,
  boolToSheet,
  jsonFromSheet,
  jsonToSheet,
  numFromSheet,
  str,
} from "./sheetRowCodec";
import {
  APP_CONFIG_GLOBAL_ID,
  mergeAdminAppInfo,
  normalizeAdminAppInfo,
  readAdminAppInfo,
  writeAdminAppInfo,
  type AdminAppInfo,
} from "./adminAppInfo";
import { ADMIN_USER_ID, shouldExcludeFromPublicCatalog } from "./accountRoles";
import { buildSuggestionCatalog } from "./suggestionCatalog";
import { shouldSkipEmailVerificationFromSheets } from "./sheetAuth";
import {
  isActiveProMemberRow,
  mergeProfessionalsCatalog,
  viewerSettingsRowToProfessional,
} from "./proDirectory";
import {
  buildNotificationInboxRow,
  isNotificationInboxRow,
  mergeNotificationInbox,
  parseNotificationInbox,
} from "./notificationInbox";
import {
  filterOutModerationDeletedConversations,
  isModerationDeletedConversation,
} from "./moderationTombstones";

const LS_CACHE_PREFIX = "nel_sheet_cache_";
const GLOBAL_CACHE_USER = "__global__";
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
  return rows.filter((r) => r.userId === userId && !isDeletedFromSheet(r.deleted));
}

/** Conserve readAt du cache local si le GET Sheets ne l’a pas encore (sync en cours ou colonne absente). */
function mergeReadAtRowsFromCache(
  fresh: Record<string, string>[],
  cached: Record<string, string>[],
): Record<string, string>[] {
  if (cached.length === 0) return fresh;
  const cacheById = new Map(cached.map((r) => [r.id, r]));
  return fresh.map((row) => {
    const cachedRow = cacheById.get(row.id);
    if (!cachedRow) return row;
    const freshRead = row.readAt?.trim() ?? "";
    const cachedRead = cachedRow.readAt?.trim() ?? "";
    if (!cachedRead) return row;
    if (!freshRead) return { ...row, readAt: cachedRead };
    const merged = Math.max(numFromSheet(freshRead, 0), numFromSheet(cachedRead, 0));
    return merged > 0 ? { ...row, readAt: String(merged) } : row;
  });
}

function mergeNotifications(
  base: AppNotification[],
  remote: AppNotification[],
): AppNotification[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((n) => [n.id, n]));
  remote.forEach((remoteN) => {
    const prev = map.get(remoteN.id);
    if (!prev) {
      map.set(remoteN.id, remoteN);
      return;
    }
    const readAt =
      prev.readAt != null && remoteN.readAt != null
        ? Math.max(prev.readAt, remoteN.readAt)
        : prev.readAt ?? remoteN.readAt;
    map.set(remoteN.id, { ...remoteN, readAt });
  });
  return [...map.values()];
}

function mergeEventReminders(
  base: EventReminder[],
  remote: EventReminder[],
): EventReminder[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((r) => [r.id, r]));
  remote.forEach((remoteR) => {
    const prev = map.get(remoteR.id);
    if (!prev) {
      map.set(remoteR.id, remoteR);
      return;
    }
    const readAt =
      prev.readAt != null && remoteR.readAt != null
        ? Math.max(prev.readAt, remoteR.readAt)
        : prev.readAt ?? remoteR.readAt;
    map.set(remoteR.id, { ...remoteR, readAt });
  });
  return [...map.values()];
}

/** Catalogue partagé (ex. `events`) : toutes les lignes actives, pas filtrées par userId. */
async function readSharedCatalogTable(
  table: SheetTableName,
): Promise<Record<string, string>[]> {
  const markActiveRows = (rows: Record<string, string>[]) => {
    rows.forEach((r) => {
      const id = r.id ?? r.profilId ?? r.userId;
      if (id) markSynced(table, id);
    });
  };

  if (isGoogleSheetsReadConfigured()) {
    try {
      const rows = await sheetGet<Record<string, string>>(table);
      const active = rows.filter((r) => !isDeletedFromSheet(r.deleted));
      saveLocalCache(table, GLOBAL_CACHE_USER, active);
      markActiveRows(active);
      return active;
    } catch (err) {
      console.error(`Sheets read [${table}] catalog failed, fallback cache:`, err);
    }
  }

  const cached = loadLocalCache(table, GLOBAL_CACHE_USER);
  markActiveRows(cached);
  return cached;
}

function patchSharedCatalogCache(
  table: SheetTableName,
  idColumn: string,
  fullRow: Record<string, string>,
): void {
  const cached = loadLocalCache(table, GLOBAL_CACHE_USER);
  const idx = cached.findIndex((r) => r[idColumn] === fullRow[idColumn]);
  const next =
    idx >= 0 ? cached.map((r, i) => (i === idx ? fullRow : r)) : [...cached, fullRow];
  saveLocalCache(table, GLOBAL_CACHE_USER, next);
}

async function readTable(table: SheetTableName, userId: string): Promise<Record<string, string>[]> {
  const cached = loadLocalCache(table, userId);
  if (isGoogleSheetsReadConfigured()) {
    try {
      const rows = await sheetGet<Record<string, string>>(table);
      let mine = rowsForUser(rows, userId);
      if (table === "notifications" || table === "event_reminders") {
        mine = mergeReadAtRowsFromCache(mine, cached);
      }
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
  if (table === "events") {
    patchSharedCatalogCache(table, idColumn, fullRow);
  }

  if (!isGoogleSheetsWriteConfigured()) return;

  const writePost = () => sheetPost(table, fullRow);
  const writePut = () => sheetPut(table, id, fullRow);

  try {
    if (isSynced(table, id)) {
      await writePut();
      return;
    }
    const postResult = await sheetMutate("post", table, { row: fullRow });
    if (postResult.skipped) {
      await writePut();
    }
    markSynced(table, id);
  } catch (firstErr) {
    try {
      await writePost();
      markSynced(table, id);
    } catch (postErr) {
      try {
        await writePut();
        markSynced(table, id);
      } catch (putErr) {
        console.error(`Sheets upsert [${table}] ${id}:`, firstErr, postErr, putErr);
        throw putErr;
      }
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
    participantAvatarsJson: jsonToSheet(event.participantAvatars ?? []),
    hideAddress: boolToSheet(event.hideAddress),
    isPrivate: boolToSheet(event.isPrivate),
    manualApproval: boolToSheet(event.manualApproval),
    hostedByViewer: boolToSheet(event.hostedByViewer),
    creatorId: event.creatorId ?? "",
    waitlistEntriesJson: jsonToSheet(event.waitlistEntries ?? []),
    invitedProfilIdsJson: jsonToSheet(event.invitedProfilIds ?? []),
    publicUrl: event.publicUrl ?? buildEventPublicUrl(event.id),
    validatedPresentProfilIdsJson: jsonToSheet(event.validatedPresentProfilIds ?? []),
    karmaOrganizerRewarded: boolToSheet(event.karmaOrganizerRewarded),
    karmaOrganizerDenied: boolToSheet(event.karmaOrganizerDenied),
    organizerRatingsJson: jsonToSheet(event.organizerRatings ?? []),
    karmaJoinPaidProfilIdsJson: jsonToSheet(event.karmaJoinPaidProfilIds ?? []),
    registeredParticipantIdsJson: jsonToSheet(event.registeredParticipantIds ?? []),
    registeredParticipantMetaJson: jsonToSheet(event.registeredParticipantMeta ?? {}),
    karmaOrganizePaid: boolToSheet(event.karmaOrganizePaid),
    joinTipEnabled: boolToSheet(event.joinTipEnabled),
    joinTipAmount:
      event.joinTipEnabled && event.joinTipAmount
        ? String(event.joinTipAmount)
        : "",
    joinTipPaidProfilIdsJson: jsonToSheet(event.joinTipPaidProfilIds ?? []),
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
    participantAvatars: jsonFromSheet<string[]>(row.participantAvatarsJson, []),
    hideAddress: boolFromSheet(row.hideAddress),
    isPrivate: boolFromSheet(row.isPrivate),
    manualApproval: boolFromSheet(row.manualApproval),
    hostedByViewer: boolFromSheet(row.hostedByViewer),
    creatorId: row.creatorId?.trim() || undefined,
    waitlistEntries: jsonFromSheet(row.waitlistEntriesJson, []),
    invitedProfilIds: jsonFromSheet(row.invitedProfilIdsJson, []),
    publicUrl: row.publicUrl?.trim() || undefined,
    validatedPresentProfilIds: jsonFromSheet(row.validatedPresentProfilIdsJson, []),
    karmaOrganizerRewarded: boolFromSheet(row.karmaOrganizerRewarded),
    karmaOrganizerDenied: boolFromSheet(row.karmaOrganizerDenied),
    organizerRatings: jsonFromSheet(row.organizerRatingsJson, []),
    karmaJoinPaidProfilIds: jsonFromSheet(row.karmaJoinPaidProfilIdsJson, []),
    registeredParticipantIds: jsonFromSheet(row.registeredParticipantIdsJson, []),
    registeredParticipantMeta: jsonFromSheet<
      Record<string, { name?: string; imageUrl?: string }>
    >(row.registeredParticipantMetaJson, {}),
    karmaOrganizePaid: boolFromSheet(row.karmaOrganizePaid),
    joinTipEnabled: boolFromSheet(row.joinTipEnabled),
    joinTipAmount: (() => {
      const raw = row.joinTipAmount?.trim();
      if (!raw) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(5, Math.max(1, Math.round(n)));
    })(),
    joinTipPaidProfilIds: jsonFromSheet(row.joinTipPaidProfilIdsJson, []),
    sheetOwnerUserId: row.userId?.trim() || undefined,
  };
}

export function eventPublicUrlFromRow(row: Record<string, string>): string {
  return resolveEventPublicUrl({
    id: row.id,
    publicUrl: row.publicUrl?.trim() || undefined,
  });
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
    proAddress: str(friend.proAddress),
    karma: String(friend.karma ?? 5),
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
    proAddress: str(row.proAddress) || undefined,
    karma: row.karma != null && row.karma !== "" ? numFromSheet(row.karma, 5) : 5,
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
    address: str(p.address),
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
  const mapX = numFromSheet(row.mapX, 50);
  const mapY = numFromSheet(row.mapY, 50);
  const partial = {
    id,
    firstName: str(row.firstName),
    lastName: str(row.lastName),
    category: (str(row.category) || "therapeute") as MockProfessional["category"],
    categoryLabel: str(row.categoryLabel),
    city: str(row.city),
    address: str(row.address) || undefined,
    description: str(row.description),
    imageUrl: str(row.imageUrl),
    mapX,
    mapY,
    lat: str(row.lat) ? numFromSheet(row.lat) : undefined,
    lng: str(row.lng) ? numFromSheet(row.lng) : undefined,
    verified: row.verified != null ? boolFromSheet(row.verified) : false,
    websiteUrl: str(row.websiteUrl) || undefined,
    socialUrl: str(row.socialUrl) || undefined,
    phone: str(row.phone) || undefined,
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

/** Colonnes auth de viewer_settings (après emailVerified). */
export interface ViewerSettingsAuthFields {
  passwordHash?: string;
  verificationToken?: string;
  verificationExpiresAt?: number | null;
  passwordResetToken?: string;
  passwordResetExpiresAt?: number | null;
}

export interface ViewerSettingsRow {
  userId: string;
  email: string;
  emailVerified: boolean;
  passwordHash?: string;
  verificationToken?: string;
  verificationExpiresAt?: number | null;
  passwordResetToken?: string;
  passwordResetExpiresAt?: number | null;
  avatarUrl: string;
  displayName: string;
  isPro: boolean;
  city?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  friendRequestSentJson: string;
  friendRequestRejectedJson: string;
  friendRequestDailySentDateKey?: string;
  favoriteConversationIdsJson: string;
  moderationHiddenEventIdsJson: string;
  moderationHiddenProfilIdsJson: string;
  badgesJson?: string;
  profileBadgeSuggestionsJson?: string;
  userBadgeCountsJson?: string;
  userBadgeLastSeenJson?: string;
  signupIp?: string;
  lastLoginIp?: string;
}

function subscriptionPaymentFromRow(
  row: Record<string, string>,
  prefix: "premium" | "pro",
): SubscriptionPaymentRecord {
  const monthsRaw = row[`${prefix}Months`];
  const months = monthsRaw?.trim() ? numFromSheet(monthsRaw, 0) || null : null;
  const paidRaw = row[`${prefix}LastPaymentAt`];
  const lastPaymentAt = paidRaw?.trim() ? numFromSheet(paidRaw, 0) || null : null;
  const tx = row[`${prefix}LastTransactionId`]?.trim();
  return {
    paymentValidated: boolFromSheet(row[`${prefix}PaymentValidated`]),
    months: months && months > 0 ? months : null,
    lastPaymentAt: lastPaymentAt && lastPaymentAt > 0 ? lastPaymentAt : null,
    lastTransactionId: tx || null,
  };
}

function subscriptionPaymentToRowFields(
  prefix: "premium" | "pro",
  record: SubscriptionPaymentRecord | undefined,
): Record<string, string> {
  const r = record ?? {
    paymentValidated: false,
    months: null,
    lastPaymentAt: null,
    lastTransactionId: null,
  };
  return {
    [`${prefix}PaymentValidated`]: boolToSheet(r.paymentValidated),
    [`${prefix}Months`]: r.months != null ? String(r.months) : "",
    [`${prefix}LastPaymentAt`]:
      r.lastPaymentAt != null ? String(r.lastPaymentAt) : "",
    [`${prefix}LastTransactionId`]: r.lastTransactionId ?? "",
  };
}

/** N’inclut que les champs auth explicitement fournis (évite d’effacer passwordHash / tokens au sync profil). */
function authFieldsToRow(auth?: ViewerSettingsAuthFields): Record<string, string> {
  if (!auth) return {};
  const row: Record<string, string> = {};
  if (auth.passwordHash !== undefined) row.passwordHash = str(auth.passwordHash);
  if (auth.verificationToken !== undefined) row.verificationToken = str(auth.verificationToken);
  if (auth.verificationExpiresAt !== undefined) {
    row.verificationExpiresAt =
      auth.verificationExpiresAt != null ? String(auth.verificationExpiresAt) : "";
  }
  if (auth.passwordResetToken !== undefined) {
    row.passwordResetToken = str(auth.passwordResetToken);
  }
  if (auth.passwordResetExpiresAt !== undefined) {
    row.passwordResetExpiresAt =
      auth.passwordResetExpiresAt != null ? String(auth.passwordResetExpiresAt) : "";
  }
  return row;
}

export function viewerSettingsToRow(
  userId: string,
  data: {
    email?: string;
    emailVerified?: boolean;
    avatarUrl: string;
    displayName: string;
    age?: string;
    bio?: string;
    language?: string;
    isPro: boolean;
    isPremium?: boolean;
    premiumExpiresAt?: number | null;
    proExpiresAt?: number | null;
    premiumSubscriptionPayment?: SubscriptionPaymentRecord;
    proSubscriptionPayment?: SubscriptionPaymentRecord;
    city?: string;
    websiteUrl?: string;
    socialUrl?: string;
    phone?: string;
    proAddress?: string;
    proLat?: number | null;
    proLng?: number | null;
    proCategory?: string;
    karma?: number;
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    friendRequestDailySentDateKey?: string | null;
    favoriteConversationIds: string[];
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
    viewerProfileBadges?: string[];
    profileBadgeSuggestions?: string[];
    userBadgeCountsJson?: string;
    userBadgeLastSeenJson?: string;
    signupIp?: string;
    lastLoginIp?: string;
  } & ViewerSettingsAuthFields,
): Record<string, string> {
  return {
    userId,
    id: userId,
    email: data.email ?? "",
    emailVerified: boolToSheet(data.emailVerified),
    ...authFieldsToRow(data),
    avatarUrl: data.avatarUrl,
    displayName: data.displayName,
    age: str(data.age),
    bio: str(data.bio),
    language: str(data.language),
    isPro: boolToSheet(data.isPro),
    isPremium: boolToSheet(data.isPremium),
    premiumExpiresAt:
      data.premiumExpiresAt != null ? String(data.premiumExpiresAt) : "",
    proExpiresAt: data.proExpiresAt != null ? String(data.proExpiresAt) : "",
    ...subscriptionPaymentToRowFields("premium", data.premiumSubscriptionPayment),
    ...subscriptionPaymentToRowFields("pro", data.proSubscriptionPayment),
    city: str(data.city),
    websiteUrl: str(data.websiteUrl),
    socialUrl: str(data.socialUrl),
    phone: str(data.phone),
    proAddress: str(data.proAddress),
    proLat: data.proLat != null ? String(data.proLat) : "",
    proLng: data.proLng != null ? String(data.proLng) : "",
    proCategory: str(data.proCategory),
    karma: data.karma != null ? String(data.karma) : "",
    friendRequestSentJson: jsonToSheet(data.friendRequestSentProfilIds),
    friendRequestRejectedJson: jsonToSheet(data.friendRequestRejectedProfilIds),
    friendRequestDailySentDateKey: str(data.friendRequestDailySentDateKey),
    favoriteConversationIdsJson: jsonToSheet(data.favoriteConversationIds),
    moderationHiddenEventIdsJson: jsonToSheet(data.moderationHiddenEventIds),
    moderationHiddenProfilIdsJson: jsonToSheet(data.moderationHiddenProfilIds),
    badgesJson: jsonToSheet(data.viewerProfileBadges ?? []),
    profileBadgeSuggestionsJson: jsonToSheet(data.profileBadgeSuggestions ?? []),
    userBadgeCountsJson: str(data.userBadgeCountsJson),
    userBadgeLastSeenJson: str(data.userBadgeLastSeenJson),
    ...(data.signupIp != null ? { signupIp: str(data.signupIp) } : {}),
    ...(data.lastLoginIp != null ? { lastLoginIp: str(data.lastLoginIp) } : {}),
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
    readAt: n.readAt != null ? String(n.readAt) : "",
    deleted: "false",
  };
}

export function rowToNotification(row: Record<string, string>): AppNotification {
  const readRaw = row.readAt?.trim();
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
    readAt: readRaw ? numFromSheet(row.readAt, 0) : undefined,
  };
}

/** Boîte JSON (kind=inbox) + lignes legacy encore présentes. */
export function notificationsFromUserRows(
  rows: Record<string, string>[],
): AppNotification[] {
  const active = rows.filter((r) => !isDeletedFromSheet(r.deleted));
  const inboxRow = active.find((r) => isNotificationInboxRow(r));
  const fromInbox = inboxRow
    ? parseNotificationInbox(inboxRow.messagePreview ?? "")
    : [];
  const legacy = active
    .filter((r) => !isNotificationInboxRow(r))
    .map(rowToNotification)
    .filter((n) => n.readAt == null);
  return mergeNotificationInbox(fromInbox, legacy);
}

async function loadNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const uid = userId.trim();
  if (!uid) return [];
  try {
    const rows = await sheetGet<Record<string, string>>("notifications");
    return notificationsFromUserRows(rows.filter((r) => r.userId === uid));
  } catch (err) {
    console.error("loadNotificationsForUser failed:", err);
    const cached = loadLocalCache("notifications", uid);
    return notificationsFromUserRows(cached);
  }
}

async function softDeleteLegacyNotificationRows(userId: string): Promise<void> {
  const uid = userId.trim();
  if (!uid || !isGoogleSheetsWriteConfigured()) return;
  try {
    const rows = await sheetGet<Record<string, string>>("notifications");
    for (const row of rows) {
      if (row.userId !== uid || isNotificationInboxRow(row)) continue;
      if (isDeletedFromSheet(row.deleted)) continue;
      const id = row.id?.trim();
      if (!id) continue;
      await softDeleteSheetRow("notifications", uid, id);
    }
  } catch (err) {
    console.error("softDeleteLegacyNotificationRows failed:", err);
  }
}

async function writeNotificationInbox(
  userId: string,
  notifications: AppNotification[],
): Promise<void> {
  const uid = userId.trim();
  if (!uid) return;
  const row = buildNotificationInboxRow(uid, notifications);
  await upsertSheetRow("notifications", uid, row);
  await softDeleteLegacyNotificationRows(uid);
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

export function eventReminderToRow(r: EventReminder, userId: string): Record<string, string> {
  return {
    userId,
    id: r.id,
    eventId: r.eventId,
    eventTitle: r.eventTitle,
    participantId: r.participantId,
    participantName: r.participantName,
    sentAt: String(r.sentAt),
    readAt: r.readAt != null ? String(r.readAt) : "",
    deleted: "false",
  };
}

export function rowToEventReminder(row: Record<string, string>): EventReminder {
  const readRaw = str(row.readAt);
  return {
    id: row.id,
    eventId: row.eventId,
    eventTitle: row.eventTitle ?? "",
    participantId: row.participantId ?? "",
    participantName: row.participantName ?? "",
    sentAt: numFromSheet(row.sentAt, Date.now()),
    readAt: readRaw !== "" ? numFromSheet(row.readAt, 0) : undefined,
  };
}

// ── App config (global — splash, annonces admin) ───────────────────────────

export function adminAppInfoToRow(info: AdminAppInfo): Record<string, string> {
  return {
    id: APP_CONFIG_GLOBAL_ID,
    splashScreenEnabled: boolToSheet(info.splashScreenEnabled),
    splashImageUrl: info.splashImageUrl ?? "",
    announcementModalEnabled: boolToSheet(info.announcementModalEnabled),
    announcementModalDismissible: boolToSheet(info.announcementModalDismissible),
    announcementMessage: info.announcementMessage,
    announcementRevision: String(info.announcementRevision),
    forceAppReloadOnPublish: boolToSheet(info.forceAppReloadOnPublish),
    forceReloadRevision: String(info.forceReloadRevision),
    skipEmailVerification: boolToSheet(info.skipEmailVerification),
    updatedAt: String(info.configUpdatedAt ?? Date.now()),
    deleted: "false",
  };
}

export function rowToAdminAppInfo(row: Record<string, string>): AdminAppInfo {
  return normalizeAdminAppInfo({
    splashScreenEnabled: boolFromSheet(row.splashScreenEnabled),
    splashImageUrl: row.splashImageUrl ?? "",
    announcementModalEnabled: boolFromSheet(row.announcementModalEnabled),
    announcementModalDismissible: boolFromSheet(row.announcementModalDismissible),
    announcementMessage: row.announcementMessage ?? "",
    announcementRevision: numFromSheet(row.announcementRevision, 0),
    forceAppReloadOnPublish: boolFromSheet(row.forceAppReloadOnPublish),
    forceReloadRevision: numFromSheet(row.forceReloadRevision, 0),
    skipEmailVerification: boolFromSheet(row.skipEmailVerification),
    configUpdatedAt: numFromSheet(row.updatedAt, 0),
  });
}

function cacheGlobalAppConfigRow(row: Record<string, string>): void {
  const cached = loadLocalCache("app_config", GLOBAL_CACHE_USER);
  const idx = cached.findIndex((r) => r.id === APP_CONFIG_GLOBAL_ID);
  const next =
    idx >= 0 ? cached.map((r, i) => (i === idx ? row : r)) : [...cached, row];
  saveLocalCache("app_config", GLOBAL_CACHE_USER, next);
}

export async function persistAppConfigToSheets(info: AdminAppInfo): Promise<void> {
  const row = adminAppInfoToRow(info);
  cacheGlobalAppConfigRow(row);
  if (!isGoogleSheetsWriteConfigured()) return;
  await upsertSheetRow("app_config", APP_CONFIG_GLOBAL_ID, row);
}

export function syncAppConfigToSheets(info: AdminAppInfo): void {
  syncLater(() => persistAppConfigToSheets(info));
}

export async function loadAdminAppInfoFromSheets(): Promise<AdminAppInfo | null> {
  const rows = await readGlobalTable("app_config");
  const row = rows.find((r) => r.id === APP_CONFIG_GLOBAL_ID);
  if (!row) return null;
  return rowToAdminAppInfo(row);
}

export async function hydrateAdminAppInfoFromSheets(): Promise<AdminAppInfo> {
  const local = readAdminAppInfo();
  try {
    const remote = await loadAdminAppInfoFromSheets();
    if (!remote) return local;
    const merged = mergeAdminAppInfo(local, remote);
    writeAdminAppInfo(merged);
    return merged;
  } catch (err) {
    console.error("hydrateAdminAppInfoFromSheets failed:", err);
    return local;
  }
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
  eventReminders: EventReminder[];
  professionals: MockProfessional[];
  adminAppInfo?: AdminAppInfo;
  /** Suggestions dérivées de tous les comptes viewer_settings (si suggestions/profiles vides). */
  registeredMemberSuggestions?: SuggestionProfile[];
  viewerSettings?: {
    email: string;
    emailVerified: boolean;
    avatarUrl: string;
    displayName: string;
    age?: string;
    bio?: string;
    language?: string;
    isPro: boolean;
    isPremium?: boolean;
    premiumExpiresAt?: number | null;
    proExpiresAt?: number | null;
    premiumSubscriptionPayment?: SubscriptionPaymentRecord;
    proSubscriptionPayment?: SubscriptionPaymentRecord;
    city?: string;
    websiteUrl?: string;
    socialUrl?: string;
    phone?: string;
    proAddress?: string;
    proLat?: number | null;
    proLng?: number | null;
    proCategory?: string;
    karma?: number;
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    friendRequestDailySentDateKey?: string | null;
    favoriteConversationIds: string[];
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
    viewerProfileBadges?: string[];
    profileBadgeSuggestions?: string[];
    userBadgeCountsJson?: string;
    userBadgeLastSeenJson?: string;
    signupIp?: string;
    lastLoginIp?: string;
  };
  hasRemoteData: boolean;
}

export async function loadViewerSettingsRow(
  userId: string,
): Promise<Record<string, string> | undefined> {
  const rows = await readTable("viewer_settings", userId);
  return rows[0];
}

function parseViewerSettingsFromRow(
  viewerRow: Record<string, string>,
): NonNullable<LoadedAppSheetState["viewerSettings"]> {
  return {
    email: viewerRow.email ?? "",
    emailVerified: boolFromSheet(viewerRow.emailVerified),
    avatarUrl: viewerRow.avatarUrl ?? "",
    displayName: viewerRow.displayName ?? "",
    age: str(viewerRow.age) || undefined,
    bio: str(viewerRow.bio) || undefined,
    language: str(viewerRow.language) || undefined,
    isPro: boolFromSheet(viewerRow.isPro),
    isPremium: boolFromSheet(viewerRow.isPremium),
    premiumExpiresAt: viewerRow.premiumExpiresAt
      ? numFromSheet(viewerRow.premiumExpiresAt, 0) || null
      : null,
    proExpiresAt: viewerRow.proExpiresAt
      ? numFromSheet(viewerRow.proExpiresAt, 0) || null
      : null,
    premiumSubscriptionPayment: subscriptionPaymentFromRow(viewerRow, "premium"),
    proSubscriptionPayment: subscriptionPaymentFromRow(viewerRow, "pro"),
    city: str(viewerRow.city) || undefined,
    websiteUrl: str(viewerRow.websiteUrl) || undefined,
    socialUrl: str(viewerRow.socialUrl) || undefined,
    phone: str(viewerRow.phone) || undefined,
    proAddress: str(viewerRow.proAddress) || undefined,
    proLat: str(viewerRow.proLat) ? numFromSheet(viewerRow.proLat) : null,
    proLng: str(viewerRow.proLng) ? numFromSheet(viewerRow.proLng) : null,
    proCategory: str(viewerRow.proCategory) || undefined,
    karma:
      str(viewerRow.karma) !== "" ? numFromSheet(viewerRow.karma, 5) : undefined,
    friendRequestSentProfilIds: jsonFromSheet(viewerRow.friendRequestSentJson, []),
    friendRequestRejectedProfilIds: jsonFromSheet(
      viewerRow.friendRequestRejectedJson,
      [],
    ),
    friendRequestDailySentDateKey:
      str(viewerRow.friendRequestDailySentDateKey) || null,
    favoriteConversationIds: jsonFromSheet(viewerRow.favoriteConversationIdsJson, []),
    moderationHiddenEventIds: jsonFromSheet(viewerRow.moderationHiddenEventIdsJson, []),
    moderationHiddenProfilIds: jsonFromSheet(
      viewerRow.moderationHiddenProfilIdsJson,
      [],
    ),
    viewerProfileBadges: jsonFromSheet(viewerRow.badgesJson, []),
    profileBadgeSuggestions: jsonFromSheet(viewerRow.profileBadgeSuggestionsJson, []),
    userBadgeCountsJson: str(viewerRow.userBadgeCountsJson) || undefined,
    userBadgeLastSeenJson: str(viewerRow.userBadgeLastSeenJson) || undefined,
    signupIp: str(viewerRow.signupIp) || undefined,
    lastLoginIp: str(viewerRow.lastLoginIp) || undefined,
  };
}

function emptyLoadedState(): LoadedAppSheetState {
  return {
    events: [],
    conversations: [],
    friends: [],
    suggestions: [],
    profileVisits: [],
    appNotifications: [],
    adminReports: [],
    eventReminders: [],
    professionals: [],
    hasRemoteData: false,
  };
}

/** Onglets footer → GET Sheets ciblé à chaque navigation. */
export type SheetsTabId = "chat" | "events" | "pro" | "profile";

async function readScopedUserTable(
  table: SheetTableName,
  userId: string,
  isAdmin: boolean,
): Promise<Record<string, string>[]> {
  return isAdmin ? readGlobalTable(table) : readTable(table, userId);
}

function isEligibleRegisteredMember(
  row: Record<string, string>,
  excludeUserId: string,
  skipEmailVerification: boolean,
): boolean {
  const id = row.id?.trim() || row.userId?.trim();
  if (!id || id === excludeUserId) return false;
  if (shouldExcludeFromPublicCatalog(id, row.email)) return false;
  if (isDeletedFromSheet(row.deleted)) return false;
  const label = row.displayName?.trim() || row.email?.trim();
  if (!label) return false;
  if (skipEmailVerification || boolFromSheet(row.emailVerified)) return true;
  return !!row.passwordHash?.trim();
}

function viewerSettingsRowToFriend(row: Record<string, string>): Friend {
  const id = row.id?.trim() || row.userId?.trim() || "";
  const name = row.displayName?.trim() || row.email?.trim() || id;
  const ageRaw = row.age?.trim();
  return {
    profilId: id,
    name,
    age: ageRaw ? numFromSheet(ageRaw) : null,
    city: row.city?.trim() ?? "",
    imageUrl: resolveAvatarUrl(row.avatarUrl),
    eventsInCommon: 0,
    mainChatConversationId: "",
    pseudo: name.split(/\s+/)[0] || undefined,
    verified: boolFromSheet(row.emailVerified),
    isPro: boolFromSheet(row.isPro),
  };
}

/** Annuaire découverte : tous les inscrits actifs dans viewer_settings (hors soi). */
export async function loadRegisteredMemberSuggestions(
  excludeUserId: string,
  profileVisits: ProfileVisit[],
  professionals: MockProfessional[],
): Promise<SuggestionProfile[]> {
  if (!isGoogleSheetsReadConfigured()) return [];
  try {
    const [rows, skipEmailVerification] = await Promise.all([
      sheetGet<Record<string, string>>("viewer_settings"),
      shouldSkipEmailVerificationFromSheets(),
    ]);
    const friends = rows
      .filter((row) =>
        isEligibleRegisteredMember(row, excludeUserId, skipEmailVerification),
      )
      .map(viewerSettingsRowToFriend);
    return buildSuggestionCatalog(friends, profileVisits, professionals);
  } catch (err) {
    console.error("loadRegisteredMemberSuggestions failed:", err);
    return [];
  }
}

async function attachRegisteredMemberSuggestions(
  state: LoadedAppSheetState,
  excludeUserId: string,
): Promise<LoadedAppSheetState> {
  if (state.suggestions.length > 0) return state;
  const registeredMemberSuggestions = await loadRegisteredMemberSuggestions(
    excludeUserId,
    state.profileVisits,
    state.professionals,
  );
  if (registeredMemberSuggestions.length === 0) return state;
  return {
    ...state,
    registeredMemberSuggestions,
    hasRemoteData: true,
  };
}

async function loadMergedProfessionalsCatalog(
  excludeUserId: string,
): Promise<MockProfessional[]> {
  if (!isGoogleSheetsReadConfigured()) return [];
  try {
    const [professionalRows, viewerRows, skipEmailVerification] = await Promise.all([
      readGlobalTable("professionals"),
      sheetGet<Record<string, string>>("viewer_settings"),
      shouldSkipEmailVerificationFromSheets(),
    ]);
    const memberPros = viewerRows
      .filter((row) => {
        const id = row.id?.trim() || row.userId?.trim();
        return (
          id &&
          id !== excludeUserId &&
          isActiveProMemberRow(row, skipEmailVerification)
        );
      })
      .map(viewerSettingsRowToProfessional)
      .filter((p): p is MockProfessional => p != null);
    const tablePros = professionalRows.map(rowToProfessional);
    const merged = mergeProfessionalsCatalog(tablePros, memberPros);
    const tableIds = new Set(tablePros.map((p) => p.id));
    for (const pro of memberPros) {
      if (!tableIds.has(pro.id)) {
        syncProfessionalToSheets(pro);
      }
    }
    return merged;
  } catch (err) {
    console.error("loadMergedProfessionalsCatalog failed:", err);
    return [];
  }
}

export async function loadTabStateFromSheets(
  tab: SheetsTabId,
  userId: string,
  isAdmin = false,
): Promise<LoadedAppSheetState> {
  switch (tab) {
    case "events": {
      const eventRows = await readSharedCatalogTable("events");
      return {
        ...emptyLoadedState(),
        events: eventRows.map(rowToEvent),
        hasRemoteData: eventRows.length > 0,
      };
    }
    case "chat": {
      const [convRows, suggestionRows, profileRows, visitRows, professionals] =
        await Promise.all([
        readScopedUserTable("conversations", userId, isAdmin),
        readScopedUserTable("suggestions", userId, isAdmin),
        readScopedUserTable("profiles", userId, isAdmin),
        readScopedUserTable("profile_visits", userId, isAdmin),
        loadMergedProfessionalsCatalog(userId),
      ]);
      const profileVisits = visitRows.map(rowToVisit);
      return attachRegisteredMemberSuggestions(
        {
          ...emptyLoadedState(),
          conversations: convRows.map(rowToConversation),
          suggestions: suggestionRows.map(rowToSuggestion),
          friends: friendsFromProfileRows(profileRows, userId),
          profileVisits,
          professionals,
          hasRemoteData:
            convRows.length > 0 ||
            suggestionRows.length > 0 ||
            profileRows.length > 0 ||
            visitRows.length > 0,
        },
        userId,
      );
    }
    case "pro": {
      const professionals = await loadMergedProfessionalsCatalog(userId);
      return {
        ...emptyLoadedState(),
        professionals,
        hasRemoteData: professionals.length > 0,
      };
    }
    case "profile": {
      const [viewerRows, notifRows, reportRows, reminderRows, appConfigRows] =
        await Promise.all([
        readTable("viewer_settings", userId),
        readTable("notifications", userId),
        readTable("admin_reports", userId),
        readTable("event_reminders", userId),
        readGlobalTable("app_config"),
      ]);
      const viewerRow = viewerRows[0];
      const appConfigRow = appConfigRows.find((r) => r.id === APP_CONFIG_GLOBAL_ID);
      return {
        ...emptyLoadedState(),
        appNotifications: notificationsFromUserRows(notifRows),
        adminReports: reportRows.map(rowToReport),
        eventReminders: reminderRows.map(rowToEventReminder),
        adminAppInfo: appConfigRow ? rowToAdminAppInfo(appConfigRow) : undefined,
        viewerSettings: viewerRow ? parseViewerSettingsFromRow(viewerRow) : undefined,
        hasRemoteData: !!(
          viewerRow ||
          notifRows.length > 0 ||
          reportRows.length > 0 ||
          reminderRows.length > 0 ||
          appConfigRow
        ),
      };
    }
  }
}

function mergeById<T extends { id: string }>(base: T[], remote: T[]): T[] {
  if (remote.length === 0) return base;
  const map = new Map(base.map((item) => [item.id, item]));
  remote.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

/** Plusieurs lignes Sheets (1 par userId) → une conversation par id (la plus récente). */
function dedupeConversationsById(conversations: Conversation[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const c of conversations) {
    if (isModerationDeletedConversation(c.id)) continue;
    const prev = map.get(c.id);
    if (!prev || (c.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) {
      map.set(c.id, c);
    }
  }
  return [...map.values()];
}

function friendsFromProfileRows(
  rows: Record<string, string>[],
  userId: string,
): Friend[] {
  const friends = rows.map(rowToFriend);
  const filtered = filterOutSelfFriends(friends, userId);
  if (filtered.length < friends.length) {
    syncProfileDeleteToSheets(userId);
  }
  return filtered;
}

function mergeFriends(base: Friend[], remote: Friend[]): Friend[] {
  const viewerId = currentUserId();
  const safeBase = filterOutSelfFriends(base, viewerId);
  if (remote.length === 0) return safeBase;
  const safeRemote = filterOutSelfFriends(remote, viewerId);
  if (viewerId && safeRemote.length < remote.length) {
    syncProfileDeleteToSheets(viewerId);
  }
  const map = new Map(safeBase.map((f) => [f.profilId, f]));
  safeRemote.forEach((f) => map.set(f.profilId, f));
  return [...map.values()];
}

async function readGlobalTable(table: SheetTableName): Promise<Record<string, string>[]> {
  const markActiveRows = (rows: Record<string, string>[]) => {
    rows.forEach((r) => {
      const id = r.id;
      if (id) markSynced(table, id);
    });
  };

  if (isGoogleSheetsReadConfigured()) {
    try {
      const rows = await sheetGet<Record<string, string>>(table);
      const active = rows.filter((r) => !isDeletedFromSheet(r.deleted));
      saveLocalCache(table, GLOBAL_CACHE_USER, active);
      markActiveRows(active);
      return active;
    } catch (err) {
      console.error(`Sheets read [${table}] failed, fallback cache:`, err);
    }
  }

  const cached = loadLocalCache(table, GLOBAL_CACHE_USER);
  if (cached.length > 0) {
    markActiveRows(cached);
    return cached;
  }

  try {
    const rows = await sheetGet<Record<string, string>>(table);
    const active = rows.filter((r) => !isDeletedFromSheet(r.deleted));
    if (active.length > 0) {
      saveLocalCache(table, GLOBAL_CACHE_USER, active);
      markActiveRows(active);
      return active;
    }
  } catch (err) {
    console.error(`Global table [${table}] local fallback failed:`, err);
  }

  return [];
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

export async function loadAppStateFromSheets(
  userId: string,
  isAdmin = false,
): Promise<LoadedAppSheetState> {
  const [
    eventRows,
    convRows,
    profileRows,
    suggestionRows,
    visitRows,
    viewerRows,
    notifRows,
    reportRows,
    reminderRows,
    professionalRows,
    appConfigRows,
  ] = await Promise.all([
    readSharedCatalogTable("events"),
    readScopedUserTable("conversations", userId, isAdmin),
    readScopedUserTable("profiles", userId, isAdmin),
    readScopedUserTable("suggestions", userId, isAdmin),
    readScopedUserTable("profile_visits", userId, isAdmin),
    readTable("viewer_settings", userId),
    readTable("notifications", userId),
    readTable("admin_reports", userId),
    readTable("event_reminders", userId),
    readGlobalTable("professionals"),
    readGlobalTable("app_config"),
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
    reminderRows.length > 0 ||
    professionalRows.length > 0 ||
    appConfigRows.length > 0;

  const appConfigRow = appConfigRows.find((r) => r.id === APP_CONFIG_GLOBAL_ID);
  const adminAppInfo = appConfigRow ? rowToAdminAppInfo(appConfigRow) : undefined;

  const professionals = await loadMergedProfessionalsCatalog(userId);

  return attachRegisteredMemberSuggestions(
    {
      events: eventRows.map(rowToEvent),
      conversations: convRows.map(rowToConversation),
      friends: friendsFromProfileRows(profileRows, userId),
      suggestions: suggestionRows.map(rowToSuggestion),
      profileVisits: visitRows.map(rowToVisit),
      appNotifications: notificationsFromUserRows(notifRows),
      adminReports: reportRows.map(rowToReport),
      eventReminders: reminderRows.map(rowToEventReminder),
      professionals,
      adminAppInfo,
      viewerSettings: viewerRow ? parseViewerSettingsFromRow(viewerRow) : undefined,
      hasRemoteData,
    },
    userId,
  );
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
    eventReminders: EventReminder[];
    favoriteConversationIds: string[];
    friendRequestSentProfilIds: string[];
    friendRequestRejectedProfilIds: string[];
    friendRequestDailySentDateKey: string | null;
    moderationHiddenEventIds: string[];
    moderationHiddenProfilIds: string[];
  },
  loaded: LoadedAppSheetState,
  sheetsAdminScope = false,
): Partial<typeof current> & {
  viewerProfileAvatarUrl?: string;
  viewerProfileDisplayName?: string;
  viewerProfileIsPro?: boolean;
  nelDemoIsPremium?: boolean;
  viewerPremiumExpiresAt?: number | null;
  viewerProExpiresAt?: number | null;
  premiumSubscriptionPayment?: SubscriptionPaymentRecord;
  proSubscriptionPayment?: SubscriptionPaymentRecord;
  viewerProfileBadges?: string[];
  profileBadgeSuggestions?: string[];
  viewerProfileCity?: string;
  viewerProfileAge?: string;
  viewerProfileBio?: string;
  viewerPreferredLanguage?: "fr" | "en";
  viewerProWebsiteUrl?: string;
  viewerProSocialUrl?: string;
  viewerProPhone?: string;
  viewerProAddress?: string;
  viewerProLat?: number | null;
  viewerProLng?: number | null;
  viewerProCategory?: import("./proCategory").ProCategory;
  viewerKarma?: number;
  adminAppInfo?: AdminAppInfo;
  userBadgeLastSeenAt?: import("./userBadges").UserBadgeLastSeen;
} {
  const patch: Partial<typeof current> & {
    adminAppInfo?: AdminAppInfo;
    viewerProfileAvatarUrl?: string;
    viewerProfileDisplayName?: string;
    viewerProfileIsPro?: boolean;
    viewerProWebsiteUrl?: string;
    viewerProSocialUrl?: string;
    viewerProPhone?: string;
    viewerProAddress?: string;
    viewerProLat?: number | null;
    viewerProLng?: number | null;
    viewerKarma?: number;
  } = {};

  if (loaded.events.length > 0) {
    patch.events = mergeById(current.events, loaded.events);
  }
  if (sheetsAdminScope) {
    patch.conversations = dedupeConversationsById(loaded.conversations);
  } else if (loaded.conversations.length > 0) {
    patch.conversations = filterOutModerationDeletedConversations(
      mergeById(current.conversations, loaded.conversations),
    );
  }
  if (loaded.friends.length > 0) {
    patch.friends = mergeFriends(current.friends, loaded.friends);
  }
  if (loaded.suggestions.length > 0) {
    patch.suggestions = mergeById(current.suggestions, loaded.suggestions);
  } else if (loaded.registeredMemberSuggestions?.length) {
    patch.suggestions = loaded.registeredMemberSuggestions;
  }
  if (loaded.profileVisits.length > 0) {
    patch.profileVisits = mergeById(current.profileVisits, loaded.profileVisits);
  }
  if (loaded.appNotifications.length > 0) {
    patch.appNotifications = mergeNotifications(
      current.appNotifications,
      loaded.appNotifications,
    );
  }
  if (loaded.adminReports.length > 0) {
    patch.adminReports = mergeById(current.adminReports, loaded.adminReports);
  }
  if (loaded.eventReminders.length > 0) {
    patch.eventReminders = mergeEventReminders(
      current.eventReminders,
      loaded.eventReminders,
    );
  }

    if (loaded.adminAppInfo) {
      const localInfo = readAdminAppInfo();
      const merged = mergeAdminAppInfo(localInfo, loaded.adminAppInfo);
      patch.adminAppInfo = merged;
    }

  if (loaded.viewerSettings) {
    const vs = loaded.viewerSettings;
    if (vs.avatarUrl) patch.viewerProfileAvatarUrl = resolveAvatarUrl(vs.avatarUrl);
    if (vs.displayName) patch.viewerProfileDisplayName = vs.displayName;
    if (vs.age != null) patch.viewerProfileAge = vs.age;
    if (vs.bio != null) patch.viewerProfileBio = vs.bio;
    if (vs.language === "fr" || vs.language === "en") {
      patch.viewerPreferredLanguage = vs.language;
    }
    patch.viewerProfileIsPro = vs.isPro;
    patch.nelDemoIsPremium = vs.isPremium;
    if (vs.premiumExpiresAt != null) {
      patch.viewerPremiumExpiresAt = vs.premiumExpiresAt;
    }
    if (vs.proExpiresAt != null) {
      patch.viewerProExpiresAt = vs.proExpiresAt;
    }
    if (vs.premiumSubscriptionPayment) {
      patch.premiumSubscriptionPayment = vs.premiumSubscriptionPayment;
    }
    if (vs.proSubscriptionPayment) {
      patch.proSubscriptionPayment = vs.proSubscriptionPayment;
    }
    if (vs.viewerProfileBadges?.length) {
      patch.viewerProfileBadges = vs.viewerProfileBadges;
    }
    if (vs.profileBadgeSuggestions?.length) {
      patch.profileBadgeSuggestions = vs.profileBadgeSuggestions;
    }
    if (vs.city != null) patch.viewerProfileCity = vs.city;
    if (vs.websiteUrl != null) patch.viewerProWebsiteUrl = vs.websiteUrl;
    if (vs.socialUrl != null) patch.viewerProSocialUrl = vs.socialUrl;
    if (vs.phone != null) patch.viewerProPhone = vs.phone;
    if (vs.proAddress != null) patch.viewerProAddress = vs.proAddress;
    if (vs.proLat != null) patch.viewerProLat = vs.proLat;
    if (vs.proLng != null) patch.viewerProLng = vs.proLng;
    if (vs.proCategory != null) {
      patch.viewerProCategory = isProCategory(vs.proCategory)
        ? vs.proCategory
        : DEFAULT_PRO_CATEGORY;
    }
    if (vs.karma != null) patch.viewerKarma = vs.karma;
    if (vs.friendRequestSentProfilIds.length > 0) {
      patch.friendRequestSentProfilIds = vs.friendRequestSentProfilIds;
    }
    if (vs.friendRequestRejectedProfilIds.length > 0) {
      patch.friendRequestRejectedProfilIds = vs.friendRequestRejectedProfilIds;
    }
    if (vs.friendRequestDailySentDateKey) {
      patch.friendRequestDailySentDateKey = vs.friendRequestDailySentDateKey;
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
    if (vs.userBadgeLastSeenJson) {
      patch.userBadgeLastSeenAt = parseUserBadgeLastSeen(vs.userBadgeLastSeenJson);
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
  const userId = event.sheetOwnerUserId?.trim() || currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("events", event.id, eventToRow(event, userId)));
}

export function syncEventDeleteToSheets(
  eventId: string,
  ownerUserId?: string,
): void {
  const userId = ownerUserId?.trim() || currentUserId();
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

function markDeletedInCache(
  table: SheetTableName,
  cacheUser: string,
  match: (row: Record<string, string>) => boolean,
): void {
  const cached = loadLocalCache(table, cacheUser);
  if (cached.length === 0) return;
  const next = cached.map((r) => (match(r) ? { ...r, deleted: "true" } : r));
  saveLocalCache(table, cacheUser, next);
}

async function softDeleteAllRowsMatching(
  table: SheetTableName,
  match: (row: Record<string, string>) => boolean,
  idColumn = "id",
): Promise<void> {
  markDeletedInCache(table, GLOBAL_CACHE_USER, match);

  if (!isGoogleSheetsReadConfigured() && !isGoogleSheetsWriteConfigured()) {
    return;
  }

  try {
    const rows = await sheetGet<Record<string, string>>(table);
    const userCaches = new Set<string>();
    for (const row of rows) {
      if (!match(row) || isDeletedFromSheet(row.deleted)) continue;
      const uid = row.userId?.trim();
      const rowId = row[idColumn]?.trim();
      if (!uid || !rowId) continue;
      userCaches.add(uid);
      if (isGoogleSheetsWriteConfigured()) {
        await softDeleteSheetRow(table, uid, rowId, idColumn);
      }
      markDeletedInCache(table, uid, (r) => r[idColumn] === rowId);
    }
    for (const uid of userCaches) {
      markDeletedInCache(table, uid, match);
    }
  } catch (err) {
    console.error(`softDeleteAllRowsMatching [${table}] failed:`, err);
  }
}

/** Suppression admin : toutes les lignes Sheets + caches pour un fil. */
export function syncConversationDeleteGlobalToSheets(conversationId: string): void {
  const cid = conversationId.trim();
  if (!cid) return;
  syncLater(() => softDeleteAllRowsMatching("conversations", (r) => r.id === cid));
}

/** Suppression admin : fil de messages associé. */
export function syncMessageThreadDeleteToSheets(conversationId: string): void {
  const cid = conversationId.trim();
  if (!cid) return;
  syncLater(() =>
    softDeleteAllRowsMatching(
      "messages",
      (r) => r.id === cid || r.conversationId === cid,
    ),
  );
}

export function syncFriendToSheets(friend: Friend): void {
  const userId = currentUserId();
  if (!userId || isSelfProfilId(friend.profilId, userId)) return;
  syncLater(() =>
    upsertSheetRow("profiles", friend.profilId, friendToRow(friend, userId), "id"),
  );
}

export function syncFriendToSheetsForUser(friend: Friend, targetUserId: string): void {
  const uid = targetUserId.trim();
  if (!uid || isSelfProfilId(friend.profilId, uid)) return;
  syncLater(() =>
    upsertSheetRow("profiles", friend.profilId, friendToRow(friend, uid), "id"),
  );
}

export function syncProfileDeleteToSheets(profilId: string): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => softDeleteSheetRow("profiles", userId, profilId, "id"));
}

export function syncViewerSettingsToSheets(data: {
  email?: string;
  emailVerified?: boolean;
  avatarUrl: string;
  displayName: string;
  isPro: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: number | null;
  proExpiresAt?: number | null;
  premiumSubscriptionPayment?: SubscriptionPaymentRecord;
  proSubscriptionPayment?: SubscriptionPaymentRecord;
  city?: string;
  websiteUrl?: string;
  socialUrl?: string;
  phone?: string;
  proAddress?: string;
  proLat?: number | null;
  proLng?: number | null;
  viewerProfileBadges?: string[];
  profileBadgeSuggestions?: string[];
  userBadgeCountsJson?: string;
  userBadgeLastSeenJson?: string;
  friendRequestSentProfilIds: string[];
  friendRequestRejectedProfilIds: string[];
  friendRequestDailySentDateKey?: string | null;
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
  if (!userId || n.readAt != null) return;
  syncLater(async () => {
    const existing = await loadNotificationsForUser(userId);
    await writeNotificationInbox(userId, mergeNotificationInbox(existing, [n]));
  });
}

export function syncNotificationToSheetsForUser(
  n: AppNotification,
  userId: string,
): void {
  const owner = userId?.trim();
  if (!owner || n.readAt != null) return;
  syncLater(async () => {
    const existing = await loadNotificationsForUser(owner);
    await writeNotificationInbox(owner, mergeNotificationInbox(existing, [n]));
  });
}

export function syncUserUnreadNotificationsToSheets(
  userId: string,
  notifications: AppNotification[],
): void {
  const owner = userId.trim();
  if (!owner) return;
  const unread = notifications.filter((n) => n.readAt == null);
  syncLater(() => writeNotificationInbox(owner, unread));
}

export function syncNotificationReadToSheets(notificationId: string): void {
  const userId = currentUserId();
  const id = notificationId.trim();
  if (!userId || !id) return;
  syncLater(async () => {
    const existing = await loadNotificationsForUser(userId);
    await writeNotificationInbox(
      userId,
      existing.filter((n) => n.id !== id),
    );
  });
}

export function syncProfileVisitToSheetsForUser(
  visit: ProfileVisit,
  ownerUserId: string,
): void {
  const owner = ownerUserId?.trim();
  if (!owner) return;
  syncLater(() =>
    upsertSheetRow("profile_visits", visit.id, visitToRow(visit, owner), "id"),
  );
}


export function syncEventReminderToSheets(r: EventReminder): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("event_reminders", r.id, eventReminderToRow(r, userId)));
}

export function syncReportToSheets(r: AdminReportEntry): void {
  const userId = currentUserId();
  if (!userId) return;
  syncLater(() => upsertSheetRow("admin_reports", r.id, reportToRow(r, userId)));
}

/** Alerte sécurité → file admin (sans session utilisateur active). */
export async function syncAdminSecurityAlertToSheets(r: AdminReportEntry): Promise<void> {
  await upsertSheetRow("admin_reports", r.id, reportToRow(r, ADMIN_USER_ID));
}

/** Enregistre l’IP de création / dernière connexion (PUT partiel). */
export async function syncViewerLoginIpToSheets(
  userId: string,
  ips: { signupIp: string; lastLoginIp: string },
): Promise<void> {
  await upsertSheetRow("viewer_settings", userId, {
    userId,
    id: userId,
    signupIp: ips.signupIp,
    lastLoginIp: ips.lastLoginIp,
  });
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
  viewerProfileAge?: string;
  viewerProfileBio?: string;
  language?: string;
  viewerProfileIsPro: boolean;
  nelDemoIsPremium?: boolean;
  viewerPremiumExpiresAt?: number | null;
  viewerProExpiresAt?: number | null;
  premiumSubscriptionPayment?: SubscriptionPaymentRecord;
  proSubscriptionPayment?: SubscriptionPaymentRecord;
  viewerProfileBadges: string[];
  profileBadgeSuggestions: string[];
  userBadgeCountsJson?: string;
  userBadgeLastSeenJson?: string;
  viewerProfileCity?: string;
  viewerProfileAge?: string;
  viewerProfileBio?: string;
  viewerPreferredLanguage?: "fr" | "en";
  viewerProWebsiteUrl?: string;
  viewerProSocialUrl?: string;
  viewerProPhone?: string;
  viewerProAddress?: string;
  viewerProLat?: number | null;
  viewerProLng?: number | null;
  viewerProCategory?: import("./proCategory").ProCategory;
  viewerKarma?: number;
  friendRequestSentProfilIds: string[];
  friendRequestRejectedProfilIds: string[];
  friendRequestDailySentDateKey?: string | null;
  favoriteConversationIds: string[];
  moderationHiddenEventIds: string[];
  moderationHiddenProfilIds: string[];
}): void {
  syncViewerSettingsToSheets({
    email: state.email,
    emailVerified: state.emailVerified,
    avatarUrl: state.viewerProfileAvatarUrl,
    displayName: state.viewerProfileDisplayName,
    age: state.viewerProfileAge,
    bio: state.viewerProfileBio,
    language: state.language,
    isPro: state.viewerProfileIsPro,
    isPremium: state.nelDemoIsPremium,
    premiumExpiresAt: state.viewerPremiumExpiresAt,
    proExpiresAt: state.viewerProExpiresAt,
    premiumSubscriptionPayment: state.premiumSubscriptionPayment,
    proSubscriptionPayment: state.proSubscriptionPayment,
    viewerProfileBadges: state.viewerProfileBadges,
    profileBadgeSuggestions: state.profileBadgeSuggestions,
    city: state.viewerProfileCity,
    websiteUrl: state.viewerProWebsiteUrl,
    socialUrl: state.viewerProSocialUrl,
    phone: state.viewerProPhone,
    proAddress: state.viewerProAddress,
    proLat: state.viewerProLat,
    proLng: state.viewerProLng,
    proCategory: state.viewerProCategory,
    karma: state.viewerKarma,
    friendRequestSentProfilIds: state.friendRequestSentProfilIds,
    friendRequestRejectedProfilIds: state.friendRequestRejectedProfilIds,
    friendRequestDailySentDateKey: state.friendRequestDailySentDateKey,
    favoriteConversationIds: state.favoriteConversationIds,
    moderationHiddenEventIds: state.moderationHiddenEventIds,
    moderationHiddenProfilIds: state.moderationHiddenProfilIds,
    userBadgeCountsJson: state.userBadgeCountsJson,
    userBadgeLastSeenJson: state.userBadgeLastSeenJson,
  });
}

/** À l'inscription — profil + colonnes auth dans viewer_settings (attendre la fin). */
export async function persistPendingSignupToSheets(
  userId: string,
  email: string,
  displayName: string,
  isPro: boolean,
  auth: ViewerSettingsAuthFields & { emailVerified: boolean; passwordHash: string },
  signupIp?: string,
  profileExtras?: { age?: string; bio?: string; language?: string },
): Promise<void> {
  const viewerRow = viewerSettingsToRow(userId, {
    email,
    emailVerified: auth.emailVerified,
    passwordHash: auth.passwordHash,
    verificationToken: auth.verificationToken ?? "",
    verificationExpiresAt: auth.verificationExpiresAt ?? null,
    passwordResetToken: auth.passwordResetToken ?? "",
    passwordResetExpiresAt: auth.passwordResetExpiresAt ?? null,
    avatarUrl: "",
    displayName,
    age: profileExtras?.age ?? "",
    bio: profileExtras?.bio ?? "",
    language: profileExtras?.language ?? "fr",
    isPro,
    signupIp,
    friendRequestSentProfilIds: [],
    friendRequestRejectedProfilIds: [],
    favoriteConversationIds: [],
    moderationHiddenEventIds: [],
    moderationHiddenProfilIds: [],
  });
  await upsertSheetRow("viewer_settings", userId, viewerRow);
  if (isPro) {
    try {
      const pro = viewerSettingsRowToProfessional(viewerRow);
      if (pro) {
        await upsertSheetRow("professionals", pro.id, professionalToRow(pro));
      }
    } catch (err) {
      console.error("persistPendingSignupToSheets: professionals upsert failed:", err);
    }
  }
}

/** @deprecated Préférer persistPendingSignupToSheets (await). */
export function syncPendingSignupToSheets(
  userId: string,
  email: string,
  displayName: string,
  isPro: boolean,
  auth: ViewerSettingsAuthFields & { emailVerified: boolean; passwordHash: string },
  signupIp?: string,
  profileExtras?: { age?: string; bio?: string; language?: string },
): void {
  syncLater(() =>
    persistPendingSignupToSheets(
      userId,
      email,
      displayName,
      isPro,
      auth,
      signupIp,
      profileExtras,
    ),
  );
}

/** Renvoi email de vérification — met à jour les tokens (attendre la fin). */
export async function persistVerificationTokenToSheets(
  userId: string,
  verificationToken: string,
  verificationExpiresAt: number | null,
): Promise<void> {
  await upsertSheetRow("viewer_settings", userId, {
    userId,
    id: userId,
    verificationToken,
    verificationExpiresAt:
      verificationExpiresAt != null ? String(verificationExpiresAt) : "",
  });
}

/** Renvoi email de vérification — met à jour les tokens. */
export function syncVerificationTokenToSheets(
  userId: string,
  verificationToken: string,
  verificationExpiresAt: number | null,
): void {
  syncLater(() =>
    upsertSheetRow("viewer_settings", userId, {
      userId,
      id: userId,
      verificationToken,
      verificationExpiresAt:
        verificationExpiresAt != null ? String(verificationExpiresAt) : "",
    }),
  );
}

/** Demande reset mot de passe — enregistre les tokens reset (attendre la fin). */
export async function persistPasswordResetTokenToSheets(
  userId: string,
  passwordResetToken: string,
  passwordResetExpiresAt: number | null,
): Promise<void> {
  await upsertSheetRow("viewer_settings", userId, {
    userId,
    id: userId,
    passwordResetToken,
    passwordResetExpiresAt:
      passwordResetExpiresAt != null ? String(passwordResetExpiresAt) : "",
  });
}

/** Demande reset mot de passe — enregistre les tokens reset. */
export function syncPasswordResetTokenToSheets(
  userId: string,
  passwordResetToken: string,
  passwordResetExpiresAt: number | null,
): void {
  syncLater(() =>
    upsertSheetRow("viewer_settings", userId, {
      userId,
      id: userId,
      passwordResetToken,
      passwordResetExpiresAt:
        passwordResetExpiresAt != null ? String(passwordResetExpiresAt) : "",
    }),
  );
}

/** Après reset mot de passe — nouveau hash, tokens reset effacés. */
export async function persistPasswordHashToSheets(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await upsertSheetRow("viewer_settings", userId, {
    userId,
    id: userId,
    passwordHash,
    passwordResetToken: "",
    passwordResetExpiresAt: "",
  });
}

/** Après reset mot de passe — nouveau hash, tokens reset effacés. */
export function syncPasswordHashToSheets(userId: string, passwordHash: string): void {
  syncLater(() =>
    upsertSheetRow("viewer_settings", userId, {
      userId,
      id: userId,
      passwordHash,
      passwordResetToken: "",
      passwordResetExpiresAt: "",
    }),
  );
}

/** Après vérification email — sync Sheets sans dépendre du store messaging. */
export async function persistEmailVerifiedToSheets(
  userId: string,
  email: string,
  displayName: string,
  avatarUrl: string,
  isPro: boolean,
  websiteUrl?: string,
  socialUrl?: string,
  phone?: string,
  signupIp?: string,
): Promise<void> {
  await upsertSheetRow(
    "viewer_settings",
    userId,
    viewerSettingsToRow(userId, {
      email,
      emailVerified: true,
      verificationToken: "",
      verificationExpiresAt: null,
      passwordResetToken: "",
      passwordResetExpiresAt: null,
      avatarUrl,
      displayName,
      isPro,
      websiteUrl,
      socialUrl,
      phone,
      signupIp,
      lastLoginIp: signupIp,
      friendRequestSentProfilIds: [],
      friendRequestRejectedProfilIds: [],
      favoriteConversationIds: [],
      moderationHiddenEventIds: [],
      moderationHiddenProfilIds: [],
    }),
  );
}

/** @deprecated Préférer persistEmailVerifiedToSheets (await). */
export function syncEmailVerifiedToSheets(
  userId: string,
  email: string,
  displayName: string,
  avatarUrl: string,
  isPro: boolean,
  websiteUrl?: string,
  socialUrl?: string,
  phone?: string,
  signupIp?: string,
): void {
  syncLater(() =>
    persistEmailVerifiedToSheets(
      userId,
      email,
      displayName,
      avatarUrl,
      isPro,
      websiteUrl,
      socialUrl,
      phone,
      signupIp,
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
