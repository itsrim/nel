import { useLayoutEffect, useRef, useEffect, useState, useCallback } from "react";
import { useThemeStore } from "./store/useThemeStore";
import {
  useNavigationStore,
  type DetailState,
} from "./store/useNavigationStore";
import { useMessagingStore } from "./store/useMessagingStore";
import { useAuthStore } from "./store/useAuthStore";
import { updateAllBadges } from "./lib/appBadge";
import { isChatApiConfigured } from "./lib/chatConfig";
import { trySetSessionToken } from "./lib/authApi";
import {
  getChatSocket,
  initGlobalChatSync,
  setActiveChatConversationId,
  shutdownGlobalChatSync,
} from "./lib/chatSync";
import { registerPushNotifications } from "./lib/pushNotifications";
import {
  loadAppStateFromSheets,
  loadTabStateFromSheets,
  type SheetsTabId,
} from "./lib/appSheetPersistence";
import {
  applySheetsLoadedState,
  refreshChatMessagesFromSheets,
} from "./lib/applySheetsState";
import { isGoogleSheetsReadConfigured } from "./lib/googleSheetsDb";
import { resolveSheetsAdminScope } from "./lib/accessScope";
import { BottomNavigation } from "./components/BottomNavigation";
import { ChatPage } from "./pages/ChatPage";
import { EventsPage } from "./pages/EventsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProsPage } from "./pages/ProsPage";
import { ProProfilePage } from "./pages/ProProfilePage";
import { ChatRoomPage } from "./pages/ChatRoomPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { CreateEventPage } from "./pages/CreateEventPage";
import { OtherProfilePage } from "./pages/OtherProfilePage";
import { ChatSettingsPage } from "./pages/ChatSettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { QuestionnaireModal } from "./components/QuestionnaireModal";
import { resolveAvatarUrl, DEFAULT_AVATAR_URL } from "./lib/avatarUrl";
import {
  markDailyQuestionnaireShown,
  shouldShowDailyQuestionnaire,
} from "./lib/questionnaireDaily";
import { useNotificationSoundEffect } from "./hooks/useNotificationSoundEffect";
import "./App.css";

function renderDetailContent(detail: DetailState) {
  switch (detail.type) {
    case "chat":
      return <ChatRoomPage id={detail.id} />;
    case "event":
      return <EventDetailPage id={detail.id} />;
    case "event_create":
      return <CreateEventPage formEventId={detail.id} />;
    case "profile":
      return <OtherProfilePage id={detail.id} />;
    case "chat_settings":
      return <ChatSettingsPage id={detail.id} />;
    case "pro":
      return <ProProfilePage id={detail.id} />;
    default:
      return null;
  }
}

function App() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const { activeTab, detailStack } = useNavigationStore();
  const toast = useMessagingStore((s) => s.toast);
  const conversations = useMessagingStore((s) => s.conversations);
  const {
    setViewerProfileDisplayName,
    setViewerProfileAvatarUrl,
    setViewerProfileIsPro,
    clearViewerSession,
    resetData,
  } = useMessagingStore();
  const { user, loadUser } = useAuthStore();
  const mainRef = useRef<HTMLElement>(null);
  const prevAuthUserIdRef = useRef<string | null>(null);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  useNotificationSoundEffect(user?.id);

  const closeQuestionnaire = useCallback(() => {
    if (user?.id) markDailyQuestionnaireShown(user.id);
    setQuestionnaireOpen(false);
  }, [user?.id]);

  // Recalcule les pastilles dès que les données source changent (notifs, chat, visites…)
  useEffect(() => {
    if (!user?.id) return;
    useMessagingStore.getState().reconcileUserBadgeCounts();
    return useMessagingStore.subscribe((state, prev) => {
      if (
        state.appNotifications !== prev.appNotifications ||
        state.conversations !== prev.conversations ||
        state.profileVisits !== prev.profileVisits ||
        state.friends !== prev.friends ||
        state.adminReports !== prev.adminReports ||
        state.friendRequestRejectedProfilIds !==
          prev.friendRequestRejectedProfilIds ||
        state.moderationHiddenProfilIds !== prev.moderationHiddenProfilIds ||
        state.userBadgeLastSeenAt !== prev.userBadgeLastSeenAt
      ) {
        state.reconcileUserBadgeCounts();
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setQuestionnaireOpen(false);
      return;
    }
    setQuestionnaireOpen(shouldShowDailyQuestionnaire(user.id));
  }, [user?.id]);

  // Load user from storage on app start
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Changement de compte : effacer le profil du précédent utilisateur puis recharger depuis Sheets.
  useEffect(() => {
    if (!user?.id) {
      prevAuthUserIdRef.current = null;
      return;
    }
    const prevId = prevAuthUserIdRef.current;
    prevAuthUserIdRef.current = user.id;
    if (prevId && prevId !== user.id) {
      clearViewerSession();
      resetData();
    }
    setViewerProfileDisplayName(user.displayName);
    setViewerProfileIsPro(!!user.isPro);
    const fromUser = resolveAvatarUrl(user.avatarUrl);
    if (fromUser !== DEFAULT_AVATAR_URL) {
      setViewerProfileAvatarUrl(fromUser);
    }
  }, [
    user?.id,
    user?.displayName,
    user?.isPro,
    user?.avatarUrl,
    setViewerProfileDisplayName,
    setViewerProfileAvatarUrl,
    setViewerProfileIsPro,
    clearViewerSession,
    resetData,
  ]);

  // Données applicatives depuis Google Sheets (chargement complet à la connexion)
  useEffect(() => {
    if (!user?.id || !isGoogleSheetsReadConfigured()) return;
    void (async () => {
      try {
        useMessagingStore.setState({ eventsLoading: true, chatLoading: true });
        const isAdmin = resolveSheetsAdminScope(user);
        const loaded = await loadAppStateFromSheets(user.id, isAdmin);
        applySheetsLoadedState(loaded);
        await refreshChatMessagesFromSheets();
      } catch (err) {
        console.error("Initial app state load from Sheets failed:", err);
      } finally {
        useMessagingStore.setState({
          eventsLoading: false,
          chatLoading: false,
        });
      }
    })();
  }, [user?.id, user?.isAdmin]);

  // GET Sheets ciblé à chaque changement d'onglet footer
  useEffect(() => {
    if (!user?.id || !isGoogleSheetsReadConfigured()) return;
    const tab = activeTab as SheetsTabId;
    if (
      tab !== "chat" &&
      tab !== "events" &&
      tab !== "pro" &&
      tab !== "profile"
    ) {
      return;
    }
    void (async () => {
      try {
        if (tab === "events") {
          useMessagingStore.setState({ eventsLoading: true });
        } else if (tab === "chat") {
          useMessagingStore.setState({ chatLoading: true });
        }
        const isAdmin = resolveSheetsAdminScope(user);
        const loaded = await loadTabStateFromSheets(tab, user.id, isAdmin);
        applySheetsLoadedState(loaded);
        if (tab === "chat") {
          await refreshChatMessagesFromSheets();
        }
      } catch (err) {
        console.error(`Sheets GET [${tab}] failed:`, err);
      } finally {
        if (tab === "events") {
          useMessagingStore.setState({ eventsLoading: false });
        } else if (tab === "chat") {
          useMessagingStore.setState({ chatLoading: false });
        }
      }
    })();
  }, [activeTab, user?.id, user?.isAdmin]);

  /** Rafraîchissement profil (demandes d'ami) — secours sans Socket.IO. */
  useEffect(() => {
    if (
      !user?.id ||
      activeTab !== "profile" ||
      !isGoogleSheetsReadConfigured() ||
      isChatApiConfigured()
    ) {
      return;
    }
    const poll = () => {
      void (async () => {
        try {
          const isAdmin = resolveSheetsAdminScope(user);
          const loaded = await loadTabStateFromSheets(
            "profile",
            user.id,
            isAdmin,
          );
          applySheetsLoadedState(loaded);
        } catch (err) {
          console.error("Sheets GET [profile poll] failed:", err);
        }
      })();
    };
    const intervalId = window.setInterval(poll, 15_000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, user?.id, user?.isAdmin]);

  useEffect(() => {
    const openChat = [...detailStack].reverse().find((d) => d.type === "chat");
    setActiveChatConversationId(openChat?.id ?? null);
  }, [detailStack]);

  const conversationIdsKey =
    conversations.length > 0
      ? conversations
          .map((c) => c.id)
          .sort()
          .join(",")
      : "";

  // Connexion Socket.IO — uniquement au changement de compte (pas à chaque message reçu).
  useEffect(() => {
    if (!user) {
      shutdownGlobalChatSync();
      return;
    }
    if (!isChatApiConfigured()) return;

    shutdownGlobalChatSync();
    void (async () => {
      await trySetSessionToken({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      });
      const ids = useMessagingStore
        .getState()
        .conversations.map((c) => c.id)
        .filter(Boolean);
      initGlobalChatSync(ids);
      void registerPushNotifications();
    })();
  }, [user?.id]);

  // Rejoindre les rooms quand la liste de conversations change (sans couper le socket).
  useEffect(() => {
    if (!user || !isChatApiConfigured() || !conversationIdsKey) return;
    const ids = conversationIdsKey.split(",");
    const s = getChatSocket();
    if (s && s.connected) {
      s.emit("user:sync", { conversationIds: ids });
    }
  }, [user?.id, conversationIdsKey]);

  // Polling global : rafraîchit les notifications, conversations et événements depuis Sheets
  // (nécessaire quand Socket.IO n'est pas configuré — 2 comptes différents)
  useEffect(() => {
    if (!user?.id || !isGoogleSheetsReadConfigured() || isChatApiConfigured()) {
      return;
    }

    const poll = () => {
      void (async () => {
        try {
          const isAdmin = resolveSheetsAdminScope(user);
          // Recharge les notifications + profil (demandes d'ami, inscriptions aux événements)
          const loaded = await loadTabStateFromSheets("profile", user.id, isAdmin);
          applySheetsLoadedState(loaded);

          // Recharge les événements pour voir les nouveaux participants
          const eventsLoaded = await loadTabStateFromSheets("events", user.id, isAdmin);
          if (eventsLoaded.events.length > 0) {
            useMessagingStore.setState({ events: eventsLoaded.events });
          }

          // Recharge les conversations pour voir les nouveaux messages et unreadCount
          const chatLoaded = await loadTabStateFromSheets("chat", user.id, isAdmin);
          if (chatLoaded.conversations.length > 0) {
            const msgStore = useMessagingStore.getState();
            const mergedConversations = chatLoaded.conversations.map((remoteConv) => {
              const local = msgStore.conversations.find((c) => c.id === remoteConv.id);
              if (!local) return remoteConv;
              const remoteUpdated = remoteConv.updatedAt ?? 0;
              const localUpdated = local.updatedAt ?? 0;
              const remoteHasNewerPreview =
                remoteUpdated > localUpdated &&
                remoteConv.lastMessagePreview !== local.lastMessagePreview;
              const mergedUnread = remoteHasNewerPreview
                ? Math.max(remoteConv.unreadCount ?? 0, (local.unreadCount ?? 0) + 1)
                : Math.max(remoteConv.unreadCount ?? 0, local.unreadCount ?? 0);
              return {
                ...local,
                unreadCount: mergedUnread,
                lastMessagePreview: remoteConv.lastMessagePreview || local.lastMessagePreview,
                updatedAt: Math.max(remoteUpdated, localUpdated),
              };
            });
            // Ajoute les conversations distantes qui n'existent pas localement
            const localIds = new Set(msgStore.conversations.map((c) => c.id));
            const newConvs = chatLoaded.conversations.filter((c) => !localIds.has(c.id));
            useMessagingStore.setState({
              conversations: [...newConvs, ...mergedConversations],
            });
          }

          // Recharge les notifications
          if (loaded.appNotifications.length > 0) {
            useMessagingStore.setState({
              appNotifications: loaded.appNotifications,
            });
          }
        } catch (err) {
          console.debug("Poll notifications failed:", err);
        }
      })();
    };

    poll();
    const intervalId = window.setInterval(poll, 3_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id, user?.isAdmin]);

  // Synchronisation des badges (favicon + icône PWA) à chaque changement
  const userBadgeCounts = useMessagingStore((s) => s.userBadgeCounts);
  useEffect(() => {
    updateAllBadges(userBadgeCounts.chat, userBadgeCounts.profile);
  }, [userBadgeCounts.chat, userBadgeCounts.profile]);

  /** Chaque onglet repart du haut (pas la position de scroll de la page précédente). */
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
    const se = document.scrollingElement;
    if (se) se.scrollTop = 0;
  }, [activeTab]);

  // If user is not logged in, show login page
  if (!user) {
    return <LoginPage />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case "chat":
        return <ChatPage />;
      case "events":
        return <EventsPage />;
      case "pro":
        return <ProsPage />;
      case "profile":
        return <ProfilePage />;
      default:
        return <ChatPage />;
    }
  };

  /**
   * Pile entièrement montée : on ne met pas `visibility: hidden` sur les couches du dessous,
   * sinon un overlay semi-transparent (ex. paramètres de discussion) ne « voile » plus la salle
   * de chat — on ne voit que l'onglet derrière, comme si la conversation avait disparu.
   * `pointer-events: none` suffit à bloquer les interactions sur les couches inférieures.
   */
  const renderDetailStack = () => {
    if (detailStack.length === 0) return null;
    return detailStack.map((detail, index) => {
      const isTop = index === detailStack.length - 1;
      return (
        <div
          key={`${detail.type}-${detail.id}-${index}`}
          className="detail-stack-layer"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000 + index * 10,
            pointerEvents: isTop ? "auto" : "none",
          }}
          aria-hidden={!isTop}
        >
          {renderDetailContent(detail)}
        </div>
      );
    });
  };

  return (
    <div className={`app ${isDarkMode ? "dark" : "light"}`}>
      <main ref={mainRef} className="app-content">
        {renderTab()}
        {renderDetailStack()}
      </main>
      {detailStack.length === 0 && !questionnaireOpen ? (
        <BottomNavigation />
      ) : null}
      {toast ? (
        <div className="nel-toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <QuestionnaireModal
        isOpen={questionnaireOpen}
        onClose={closeQuestionnaire}
      />
    </div>
  );
}

export default App;