import { useLayoutEffect, useRef, useEffect, useState, useCallback } from "react";
import {
  useNavigationStore,
  type DetailState,
} from "./store/useNavigationStore";
import { useMessagingStore } from "./store/useMessagingStore";
import { useAuthStore } from "./store/useAuthStore";
import { isChatApiConfigured } from "./lib/chatConfig";
import {
  initGlobalChatSync,
  setActiveChatConversationId,
  shutdownGlobalChatSync,
} from "./lib/chatSync";
import { registerPushNotifications } from "./lib/pushNotifications";
import {
  loadAppStateFromSheets,
  mergeLoadedAppState,
} from "./lib/appSheetPersistence";
import { writeSubscriptionPaymentRecord } from "./lib/subscriptionPersistence";
import { isGoogleSheetsReadConfigured } from "./lib/googleSheetsDb";
import { useProsStore } from "./store/useProsStore";
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
import { resolveAvatarUrl } from "./lib/avatarUrl";
import {
  markDailyQuestionnaireShown,
  shouldShowDailyQuestionnaire,
} from "./lib/questionnaireDaily";
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
  const { activeTab, detailStack } = useNavigationStore();
  const toast = useMessagingStore((s) => s.toast);
  const conversations = useMessagingStore((s) => s.conversations);
  const { setViewerProfileDisplayName, setViewerProfileAvatarUrl, setViewerProfileIsPro } =
    useMessagingStore();
  const { loadDemoData, resetData } = useMessagingStore();
  const { user, loadUser } = useAuthStore();
  const mainRef = useRef<HTMLElement>(null);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  const closeQuestionnaire = useCallback(() => {
    if (user?.id) markDailyQuestionnaireShown(user.id);
    setQuestionnaireOpen(false);
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

  // Sync auth user to messaging store profile
  useEffect(() => {
    if (user) {
      setViewerProfileDisplayName(user.displayName);
      setViewerProfileIsPro(!!user.isPro);
      // Check if it's demo user (Unsplash URL) or new user (default avatar)
      const isDemoUser = user.avatarUrl?.includes("unsplash.com");

      if (isDemoUser) {
        // Demo account: load demo data
        setViewerProfileAvatarUrl(user.avatarUrl || "");
        loadDemoData();
      } else {
        // New account: use default avatar and reset data
        setViewerProfileAvatarUrl(resolveAvatarUrl(user.avatarUrl));
        resetData();
      }
    }
  }, [
    user,
    setViewerProfileDisplayName,
    setViewerProfileAvatarUrl,
    setViewerProfileIsPro,
    loadDemoData,
    resetData,
  ]);

  // Données applicatives depuis Google Sheets (fusion avec mock / état local)
  useEffect(() => {
    if (!user?.id || !isGoogleSheetsReadConfigured()) return;
    void loadAppStateFromSheets(user.id).then((loaded) => {
      if (loaded.professionals.length > 0) {
        useProsStore.getState().hydrateProfessionals(loaded.professionals);
      }
      if (loaded.adminAppInfo) {
        useMessagingStore.setState({ adminAppInfo: loaded.adminAppInfo });
      }
      if (!loaded.hasRemoteData) return;
      const patch = mergeLoadedAppState(useMessagingStore.getState(), loaded);
      useMessagingStore.setState(patch);
      const msg = useMessagingStore.getState();
      if (patch.viewerProWebsiteUrl != null) {
        msg.setViewerProWebsiteUrl(patch.viewerProWebsiteUrl);
      }
      if (patch.viewerProSocialUrl != null) {
        msg.setViewerProSocialUrl(patch.viewerProSocialUrl);
      }
      if (patch.viewerProPhone != null) {
        msg.setViewerProPhone(patch.viewerProPhone);
      }
      if (patch.viewerProfileCity != null) {
        msg.setViewerProfileCity(patch.viewerProfileCity);
      }
      if (patch.viewerProAddress != null) {
        msg.setViewerProAddress(patch.viewerProAddress);
      }
      if (patch.viewerProLat != null && patch.viewerProLng != null) {
        msg.setViewerProLocation(
          patch.viewerProAddress ?? msg.viewerProAddress,
          patch.viewerProLat,
          patch.viewerProLng,
        );
      }
      if (patch.viewerKarma != null) {
        try {
          localStorage.setItem("nel_viewer_karma", String(patch.viewerKarma));
        } catch {
          /* ignore */
        }
        useMessagingStore.setState({ viewerKarma: patch.viewerKarma });
      }
      if (patch.viewerProfileBadges != null) {
        msg.setViewerProfileBadges(patch.viewerProfileBadges);
      }
      if (patch.profileBadgeSuggestions != null) {
        msg.setProfileBadgeSuggestions(patch.profileBadgeSuggestions);
      }
      if (patch.nelDemoIsPremium != null) {
        msg.setNelDemoIsPremium(patch.nelDemoIsPremium);
      }
      if (patch.viewerPremiumExpiresAt !== undefined) {
        useMessagingStore.setState({
          viewerPremiumExpiresAt: patch.viewerPremiumExpiresAt,
        });
      }
      if (patch.viewerProExpiresAt !== undefined) {
        useMessagingStore.setState({
          viewerProExpiresAt: patch.viewerProExpiresAt,
        });
      }
      if (patch.premiumSubscriptionPayment) {
        writeSubscriptionPaymentRecord("premium", patch.premiumSubscriptionPayment);
        useMessagingStore.setState({
          premiumSubscriptionPayment: patch.premiumSubscriptionPayment,
        });
      }
      if (patch.proSubscriptionPayment) {
        writeSubscriptionPaymentRecord("pro", patch.proSubscriptionPayment);
        useMessagingStore.setState({
          proSubscriptionPayment: patch.proSubscriptionPayment,
        });
      }
      if (loaded.viewerSettings?.emailVerified) {
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          useAuthStore.setState({
            user: { ...authUser, emailVerified: true },
          });
          localStorage.setItem(
            "nel_auth_user",
            JSON.stringify({ ...authUser, emailVerified: true }),
          );
        }
      }
    });
  }, [user?.id]);

  useEffect(() => {
    const openChat = [...detailStack].reverse().find((d) => d.type === "chat");
    setActiveChatConversationId(openChat?.id ?? null);
  }, [detailStack]);

  useEffect(() => {
    if (!user) {
      shutdownGlobalChatSync();
      return;
    }
    if (!isChatApiConfigured()) return;

    initGlobalChatSync(conversations.map((c) => c.id));
    void registerPushNotifications();
  }, [user, conversations]);

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
   * de chat — on ne voit que l’onglet derrière, comme si la conversation avait disparu.
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
    <div className="app dark">
      <main ref={mainRef} className="app-content">
        {renderTab()}
        {renderDetailStack()}
      </main>
      {detailStack.length === 0 ? <BottomNavigation /> : null}
      {toast ? (
        <div className="nel-toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <QuestionnaireModal isOpen={questionnaireOpen} onClose={closeQuestionnaire} />
    </div>
  );
}

export default App;
