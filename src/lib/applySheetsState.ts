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
import { loadHistory } from "./chatPersistence";
import { writeSubscriptionPaymentRecord } from "./subscriptionPersistence";
import { useLanguageStore } from "../store/useLanguageStore";

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
  if (loaded.professionals.length > 0) {
    const currentPros = useProsStore.getState().professionals;
    const nextPros = previewMergedProfessionals(currentPros, loaded.professionals);
    if (!dataEqual(currentPros, nextPros)) {
      useProsStore.getState().hydrateProfessionals(loaded.professionals);
    }
  }

  const msgStore = useMessagingStore.getState();

  if (!loaded.hasRemoteData) return;

  const patch = mergeLoadedAppState(msgStore, loaded);
  const changed = filterChangedPatch(msgStore, patch);

  const lang = loaded.viewerSettings?.language;
  if (lang === "fr" || lang === "en") {
    if (useLanguageStore.getState().language !== lang) {
      useLanguageStore.setState({ language: lang });
    }
  }

  if (Object.keys(changed).length === 0) return;

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
}

/** Recharge les messages depuis l'onglet messages (CSV Sheets). */
export async function refreshChatMessagesFromSheets(): Promise<void> {
  const history = await loadHistory();
  if (history.length === 0) return;

  const state = useMessagingStore.getState();
  const viewerId = useAuthStore.getState().user?.id;
  const viewerName = state.viewerProfileDisplayName;
  const mergedMsgs = { ...state.messagesByConversation };
  let hasNew = false;

  history.forEach((m) => {
    if (!mergedMsgs[m.conversationId]) mergedMsgs[m.conversationId] = [];
    if (!mergedMsgs[m.conversationId].some((msg) => msg.id === m.id)) {
      hasNew = true;
      mergedMsgs[m.conversationId].push({
        ...m,
        isOwn: m.authorId
          ? m.authorId === viewerId
          : m.authorName === viewerName,
      });
    }
  });

  if (!hasNew) return;
  useMessagingStore.setState({ messagesByConversation: mergedMsgs });
}
