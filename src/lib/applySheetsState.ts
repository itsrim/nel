/**
 * Applique un état chargé depuis Google Sheets aux stores React.
 * GET systématique ; setState uniquement si les données diffèrent du state actuel.
 */

import type { MockProfessional } from "../data/mockProfessionals";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useProsStore } from "../store/useProsStore";
import { writeAdminAppInfo } from "./adminAppInfo";
import {
  mergeLoadedAppState,
  type LoadedAppSheetState,
} from "./appSheetPersistence";
import {
  buildMissingParticipantConversations,
  resolveMessageAccessFromStores,
  userIsAppAdmin,
} from "./accessScope";
import {
  buildEventGroupMembers,
  eventGroupMemberCount,
} from "./eventGroupMembers";
import { loadHistory } from "./chatPersistence";
import { writeSubscriptionPaymentRecord } from "./subscriptionPersistence";
import { useLanguageStore } from "../store/useLanguageStore";
import { enrichEventsForViewer } from "./viewerEventScope";
import { buildSuggestionCatalog } from "./suggestionCatalog";

export function dataEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function filterChangedPatch<T extends object>(
  current: T,
  patch: Partial<T>,
): Partial<T> {
  const changed: Partial<T> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const nextVal = patch[key];
    if (nextVal === undefined) continue;
    if (!dataEqual(current[key], nextVal)) {
      changed[key] = nextVal;
    }
  }
  return changed;
}

function previewMergedProfessionals(
  current: MockProfessional[],
  remote: MockProfessional[],
): MockProfessional[] {
  const map = new Map(current.map((p) => [p.id, p]));
  remote.forEach((p) => {
    const prev = map.get(p.id);
    map.set(p.id, prev ? { ...prev, ...p } : p);
  });
  return [...map.values()];
}

export function applySheetsLoadedState(loaded: LoadedAppSheetState): void {
  const authUser = useAuthStore.getState().user;
  const viewerContext = authUser
    ? { id: authUser.id, displayName: authUser.displayName }
    : null;

  if (loaded.professionals.length > 0) {
    const currentPros = useProsStore.getState().professionals;
    const nextPros = previewMergedProfessionals(currentPros, loaded.professionals);
    if (!dataEqual(currentPros, nextPros)) {
      useProsStore.getState().hydrateProfessionals(loaded.professionals);
    }
  }

  const msgStore = useMessagingStore.getState();

  if (!loaded.hasRemoteData) {
    ensureDerivedCatalogInStore(viewerContext);
    return;
  }

  const enrichedLoaded: LoadedAppSheetState = {
    ...loaded,
    events:
      loaded.events.length > 0
        ? enrichEventsForViewer(loaded.events, viewerContext)
        : loaded.events,
  };

  const patch = mergeLoadedAppState(msgStore, enrichedLoaded);
  const changed = filterChangedPatch(msgStore, patch);

  const lang = loaded.viewerSettings?.language;
  if (lang === "fr" || lang === "en") {
    if (useLanguageStore.getState().language !== lang) {
      useLanguageStore.setState({ language: lang });
    }
  }

  if (Object.keys(changed).length === 0) {
    ensureParticipantConversationsInStore();
    ensureDerivedCatalogInStore(viewerContext);
    return;
  }

  if ("adminAppInfo" in changed && changed.adminAppInfo) {
    writeAdminAppInfo(changed.adminAppInfo);
  }

  useMessagingStore.setState(changed);

  if ("viewerProfileAge" in changed && changed.viewerProfileAge != null) {
    try {
      localStorage.setItem("nel_viewer_profile_age", changed.viewerProfileAge);
    } catch {
      /* ignore */
    }
  }
  if ("viewerProfileBio" in changed && changed.viewerProfileBio != null) {
    try {
      localStorage.setItem("nel_viewer_profile_bio", changed.viewerProfileBio);
    } catch {
      /* ignore */
    }
  }

  const msg = useMessagingStore.getState();

  if ("viewerProfileAvatarUrl" in changed && changed.viewerProfileAvatarUrl) {
    msg.setViewerProfileAvatarUrl(changed.viewerProfileAvatarUrl);
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      const nextUser = {
        ...authUser,
        avatarUrl: changed.viewerProfileAvatarUrl,
      };
      useAuthStore.setState({ user: nextUser });
      try {
        localStorage.setItem("nel_auth_user", JSON.stringify(nextUser));
      } catch {
        /* ignore */
      }
    }
  }

  if (
    "viewerProWebsiteUrl" in changed &&
    changed.viewerProWebsiteUrl != null
  ) {
    msg.setViewerProWebsiteUrl(changed.viewerProWebsiteUrl);
  }
  if ("viewerProSocialUrl" in changed && changed.viewerProSocialUrl != null) {
    msg.setViewerProSocialUrl(changed.viewerProSocialUrl);
  }
  if ("viewerProPhone" in changed && changed.viewerProPhone != null) {
    msg.setViewerProPhone(changed.viewerProPhone);
  }
  if ("viewerProfileCity" in changed && changed.viewerProfileCity != null) {
    msg.setViewerProfileCity(changed.viewerProfileCity);
  }
  if ("viewerProAddress" in changed && changed.viewerProAddress != null) {
    msg.setViewerProAddress(changed.viewerProAddress);
  }
  if (
    "viewerProLat" in changed &&
    "viewerProLng" in changed &&
    changed.viewerProLat != null &&
    changed.viewerProLng != null
  ) {
    msg.setViewerProLocation(
      changed.viewerProAddress ?? msg.viewerProAddress,
      changed.viewerProLat,
      changed.viewerProLng,
    );
  }
  if ("viewerKarma" in changed && changed.viewerKarma != null) {
    try {
      localStorage.setItem("nel_viewer_karma", String(changed.viewerKarma));
    } catch {
      /* ignore */
    }
  }
  if ("viewerProfileBadges" in changed && changed.viewerProfileBadges != null) {
    msg.setViewerProfileBadges(changed.viewerProfileBadges);
  }
  if (
    "profileBadgeSuggestions" in changed &&
    changed.profileBadgeSuggestions != null
  ) {
    msg.setProfileBadgeSuggestions(changed.profileBadgeSuggestions);
  }
  if ("nelDemoIsPremium" in changed && changed.nelDemoIsPremium != null) {
    msg.setNelDemoIsPremium(changed.nelDemoIsPremium);
  }
  if ("premiumSubscriptionPayment" in changed && changed.premiumSubscriptionPayment) {
    writeSubscriptionPaymentRecord("premium", changed.premiumSubscriptionPayment);
  }
  if ("proSubscriptionPayment" in changed && changed.proSubscriptionPayment) {
    writeSubscriptionPaymentRecord("pro", changed.proSubscriptionPayment);
  }

  if (loaded.viewerSettings?.emailVerified) {
    const authUser = useAuthStore.getState().user;
    if (authUser && !authUser.emailVerified) {
      useAuthStore.setState({
        user: { ...authUser, emailVerified: true },
      });
      localStorage.setItem(
        "nel_auth_user",
        JSON.stringify({ ...authUser, emailVerified: true }),
      );
    }
  }

  ensureParticipantConversationsInStore();
  ensureDerivedCatalogInStore(viewerContext);
}

/** Suggestions dérivées des profils Sheets, des inscrits viewer_settings ou des pros. */
function ensureDerivedCatalogInStore(
  viewerContext: { id: string; displayName?: string } | null,
): void {
  const msg = useMessagingStore.getState();
  const patch: Partial<typeof msg> = {};

  if (msg.events.length > 0 && viewerContext) {
    const enriched = enrichEventsForViewer(msg.events, viewerContext);
    if (!dataEqual(msg.events, enriched)) {
      patch.events = enriched;
    }
  }

  if (msg.suggestions.length === 0 && msg.friends.length > 0) {
    const built = buildSuggestionCatalog(
      msg.friends,
      msg.profileVisits,
      useProsStore.getState().professionals,
    );
    if (built.length > 0) patch.suggestions = built;
  }

  if (Object.keys(patch).length > 0) {
    useMessagingStore.setState(patch);
  }
}

function ensureParticipantConversationsInStore(): void {
  const user = useAuthStore.getState().user;
  const adminModeActive = useMessagingStore.getState().isAdmin;
  if (adminModeActive && userIsAppAdmin(user)) return;

  const msg = useMessagingStore.getState();
  const viewerContext = user
    ? { id: user.id, displayName: user.displayName }
    : null;
  const missing = buildMissingParticipantConversations(msg.events, msg.conversations);
  if (missing.length > 0) {
    useMessagingStore.setState({
      conversations: [...missing, ...msg.conversations],
    });
  }
  refreshLoadedEventGroupMembers(viewerContext);
}

/** Met à jour le roster (organisateur + inscrits) après chargement Sheets. */
function refreshLoadedEventGroupMembers(
  viewerContext: { id: string; displayName?: string } | null,
): void {
  const viewerId = viewerContext?.id?.trim();
  if (!viewerId) return;

  const msg = useMessagingStore.getState();
  let changed = false;
  const conversations = msg.conversations.map((c) => {
    const event = msg.events.find((e) => e.conversationId === c.id);
    if (!event) return c;
    const members = buildEventGroupMembers(event, {
      viewerId,
      viewerDisplayName: msg.viewerProfileDisplayName,
      viewerAvatarUrl: msg.viewerProfileAvatarUrl,
      friends: msg.friends,
      suggestions: msg.suggestions,
    });
    const memberCount = eventGroupMemberCount(event, members);
    if (
      JSON.stringify(c.members) === JSON.stringify(members) &&
      c.memberCount === memberCount
    ) {
      return c;
    }
    changed = true;
    return { ...c, members, memberCount };
  });

  if (changed) {
    useMessagingStore.setState({ conversations });
  }
}

/** Recharge les messages visibles (groupes membres ou tout pour admin). */
export async function refreshChatMessagesFromSheets(): Promise<void> {
  const viewerId = useAuthStore.getState().user?.id?.trim();
  if (!viewerId) return;

  const scope = resolveMessageAccessFromStores();
  const history = await loadHistory(scope);
  const viewerName = useMessagingStore.getState().viewerProfileDisplayName;
  const mergedMsgs: Record<string, ReturnType<typeof useMessagingStore.getState>["messagesByConversation"][string]> = {};

  history.forEach((m) => {
    if (!mergedMsgs[m.conversationId]) mergedMsgs[m.conversationId] = [];
    mergedMsgs[m.conversationId].push({
      ...m,
      isOwn: m.authorId ? m.authorId === viewerId : m.authorName === viewerName,
    });
  });

  useMessagingStore.setState({ messagesByConversation: mergedMsgs });
}
