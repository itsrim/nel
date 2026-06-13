import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Crown,
  Eye,
  Heart,
  HeartCrack,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  isConversationAccessible,
  resolveConversationAccessScope,
  userIsAppAdmin,
} from "../lib/accessScope";
import { SuggestionsVirtualList } from "../components/SuggestionsVirtualList";
import {
  formatRelativeTime,
  formatVisitTimeAgo,
  formatBadgeCount,
  type Conversation,
} from "../data/mockData";
import { buildConversationMiniSlots } from "../lib/conversationMiniSlots";
import { hasReachedDailyFriendRequestLimit } from "../lib/eventDateKey";
import { hasViewerPremiumAccess } from "../lib/viewerEntitlements";
import "./ChatPage.css";

/* ── Helpers ── */

/** Dernière activité visible : message (`updatedAt`) ou ouverture du fil (`lastOpenedAt`). */
function conversationRecency(c: Conversation): number {
  return Math.max(c.updatedAt, c.lastOpenedAt ?? 0);
}

function truncateStoryLabel(title: string, max = 11): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function groupStoryVariant(id: string): 0 | 1 | 2 {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i)) % 3;
  return s as 0 | 1 | 2;
}

/* ── Sub-components ── */

type SubTab = "suggestions" | "messages" | "visites";

type ChatUserHit = {
  id: string;
  label: string;
  subtitle: string;
  avatarUrl: string;
};

function foldSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function userSearchHaystack(hit: ChatUserHit): string {
  return foldSearch(`${hit.label} ${hit.subtitle}`);
}

function FavoriteStripAvatar({ conversation }: { conversation: Conversation }) {
  const v = groupStoryVariant(conversation.id);
  const { getEventByConversationId, friends, viewerProfileAvatarUrl } =
    useMessagingStore();
  const linked = getEventByConversationId(conversation.id);
  const memberN = conversation.members?.length ?? 0;
  /** Comme la liste : ≤ 2 membres → deux demi-ronds côte à côte (pas une grille 2×2 qui déborde). */
  const useDualStrip = v === 1 && memberN <= 2;
  const count = v === 0 ? 2 : v === 1 ? (useDualStrip ? 2 : 4) : 3;
  const slots = buildConversationMiniSlots(
    conversation,
    linked,
    friends,
    viewerProfileAvatarUrl,
    count,
  );
  const gradient = conversation.avatarGradient;

  const slotDiv = (i: number, className: string, fallbackBg: string) => {
    const s = slots[i];
    if (s?.hasImage && s.src) {
      return (
        <img
          key={i}
          className={`${className} chat-slot-img`}
          src={s.src}
          alt=""
        />
      );
    }
    return (
      <div key={i} className={className} style={{ background: fallbackBg }} />
    );
  };

  return (
    <div
      className="story-avatar"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      {v === 0 && (
        <div className="story-split2">
          {slotDiv(0, "story-split-half", "rgba(0,0,0,0.28)")}
          {slotDiv(1, "story-split-half", "rgba(255,255,255,0.22)")}
        </div>
      )}
      {v === 1 && useDualStrip && (
        <div className="story-split2">
          {slotDiv(0, "story-split-half", "rgba(0,0,0,0.28)")}
          {slotDiv(1, "story-split-half", "rgba(255,255,255,0.22)")}
        </div>
      )}
      {v === 1 && !useDualStrip && (
        <div className="story-grid4">
          {[0, 1, 2, 3].map((i) =>
            slotDiv(i, "story-quad", `rgba(255,255,255,${0.22 + i * 0.08})`),
          )}
        </div>
      )}
      {v === 2 && (
        <div className="story-triple">
          <div className="story-triple-top">
            {slotDiv(0, "story-triple-mini", "rgba(255,255,255,0.28)")}
            {slotDiv(1, "story-triple-mini", "rgba(0,0,0,0.2)")}
          </div>
          {slotDiv(2, "story-triple-bottom", "rgba(255,255,255,0.18)")}
        </div>
      )}
    </div>
  );
}

function FavoriteStripItem({ conversation }: { conversation: Conversation }) {
  const { openDetail } = useNavigationStore();
  const label = truncateStoryLabel(conversation.title);
  return (
    <button
      className="story-cell"
      aria-label={conversation.title}
      onClick={() => openDetail("chat", conversation.id)}
    >
      <div className="story-ring">
        <FavoriteStripAvatar conversation={conversation} />
        {conversation.unreadCount > 0 && (
          <span className="story-badge">
            {formatBadgeCount(conversation.unreadCount)}
          </span>
        )}
      </div>
      <span className="story-label">{label}</span>
    </button>
  );
}

function NewGroupStripItem() {
  const { t } = useTranslation();
  const { openDetail } = useNavigationStore();
  const { createEmptyGroup, toggleConversationFavorite } = useMessagingStore();

  const handleCreateGroup = () => {
    const title = window
      .prompt(t("createGroupNamePrompt"), t("newGroup"))
      ?.trim();
    if (!title) return;
    const id = createEmptyGroup(title);
    toggleConversationFavorite(id);
    openDetail("chat", id);
  };

  return (
    <button
      type="button"
      className="story-cell"
      aria-label={t("newGroup")}
      onClick={handleCreateGroup}
    >
      <div className="story-new-ring">
        <Plus size={26} color="rgba(255,255,255,0.92)" />
      </div>
      <span className="story-label-new">{t("addGroup")}</span>
    </button>
  );
}

function ListAvatar({ item }: { item: Conversation }) {
  const { getEventByConversationId, friends, viewerProfileAvatarUrl } =
    useMessagingStore();
  const linked = getEventByConversationId(item.id);
  const isGroup = item.type === "group";
  const slots = buildConversationMiniSlots(
    item,
    linked,
    friends,
    viewerProfileAvatarUrl,
    isGroup ? 2 : 1,
  );

  return (
    <div className="list-avatar-wrap">
      <div
        className="list-avatar"
        style={{
          background: `linear-gradient(135deg, ${item.avatarGradient[0]}, ${item.avatarGradient[1]})`,
        }}
      >
        {isGroup ? (
          <div className="group-split">
            {[0, 1].map((i) => {
              const s = slots[i];
              return (
                <div key={i} className="group-half">
                  {s?.hasImage && s.src ? (
                    <img className="chat-slot-img" src={s.src} alt="" />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background:
                          i === 0
                            ? "rgba(0,0,0,0.2)"
                            : "rgba(255,255,255,0.25)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : slots[0]?.hasImage && slots[0].src ? (
          <img className="list-avatar-dm-img" src={slots[0].src} alt="" />
        ) : (
          <span className="list-avatar-letter">{item.title.slice(0, 1)}</span>
        )}
      </div>
      {item.unreadCount > 0 && (
        <span className="list-badge">{formatBadgeCount(item.unreadCount)}</span>
      )}
    </div>
  );
}

function ConversationRow({ item }: { item: Conversation }) {
  const { openDetail } = useNavigationStore();
  const isGroup = item.type === "group";
  return (
    <button
      className="conv-row"
      aria-label={item.title}
      onClick={() => openDetail("chat", item.id)}
    >
      <div className="conv-row-inner">
        <div className="avatar-column">
          <ListAvatar item={item} />
        </div>
        <div className="row-body">
          <div className="row-top">
            <div className="name-row">
              <span className="conv-name">{item.title}</span>
              {isGroup && <span className="groupe-tag">Groupe</span>}
            </div>
            <span className="conv-time">
              {formatRelativeTime(conversationRecency(item))}
            </span>
          </div>
          <p className="conv-preview">{item.lastMessagePreview}</p>
        </div>
      </div>
    </button>
  );
}

function SubTabPill({
  label,
  active,
  onPress,
  badge,
  badgeVariant,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  badgeVariant?: "red" | "gold";
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <button
      type="button"
      className={`sub-tab ${active ? "sub-tab--active" : ""}`}
      onClick={onPress}
    >
      <div className="sub-tab-inner">
        {Icon && <Icon size={16} color={active ? "#fff" : "#8E8E93"} />}
        <span className="sub-tab-label">{label}</span>
        {badge != null && badge > 0 && (
          <span
            className={`sub-tab-badge ${badgeVariant === "gold" ? "sub-tab-badge--gold" : "sub-tab-badge--red"}`}
          >
            {formatBadgeCount(badge)}
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Main ── */

export function ChatPage() {
  const { openDetail } = useNavigationStore();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const {
    conversations,
    events,
    profileVisits,
    suggestions,
    favoriteConversationIds,
    friends,
    friendRequestSentProfilIds,
    friendRequestRejectedProfilIds,
    friendRequestDailySentDateKey,
    sendFriendRequest,
    moderationHiddenProfilIds,
    showToast,
    isAdmin: adminModeActive,
  } = useMessagingStore();
  const viewerPremiumAccess = useMessagingStore(hasViewerPremiumAccess);
  const [sub, setSub] = useState<SubTab>("messages");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const userSearchInputRef = useRef<HTMLInputElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);

  const conversationAccessScope = useMemo(
    () =>
      resolveConversationAccessScope({
        adminModeActive,
        isStaffAccount: userIsAppAdmin(user),
        conversations,
        events,
      }),
    [adminModeActive, user, conversations, events],
  );

  const accessibleConversations = useMemo(
    () =>
      conversationAccessScope === null
        ? conversations
        : conversations.filter(
            (c) =>
              isConversationAccessible(c.id, conversationAccessScope) &&
              (c.members.length === 0 || c.members.some((m) => m.isSelf)),
          ),
    [conversations, conversationAccessScope],
  );

  useEffect(() => {
    if (userSearchOpen && viewerPremiumAccess) {
      userSearchInputRef.current?.focus();
    }
  }, [userSearchOpen, viewerPremiumAccess]);

  /** Ami mutuel (cœur rose) — distinct du simple fait d’être dans l’annuaire « Amis » nel. */
  const isMutualFriend = useCallback(
    (profilId: string) =>
      friends.find((f) => f.profilId === profilId)?.mutualFriend === true,
    [friends],
  );

  const hasSentFriendRequest = useCallback(
    (profilId: string) => friendRequestSentProfilIds.includes(profilId),
    [friendRequestSentProfilIds],
  );

  const hasRejectedFriendRequest = useCallback(
    (profilId: string) => friendRequestRejectedProfilIds.includes(profilId),
    [friendRequestRejectedProfilIds],
  );

  const dailyFriendRequestLimitReached = useMemo(
    () => hasReachedDailyFriendRequestLimit(friendRequestDailySentDateKey),
    [friendRequestDailySentDateKey],
  );

  const isFriendRequestBlocked = useCallback(
    (profilId: string) =>
      isMutualFriend(profilId) ||
      hasSentFriendRequest(profilId) ||
      hasRejectedFriendRequest(profilId) ||
      (dailyFriendRequestLimitReached && !hasSentFriendRequest(profilId)),
    [
      isMutualFriend,
      hasSentFriendRequest,
      hasRejectedFriendRequest,
      dailyFriendRequestLimitReached,
    ],
  );

  const handleFriendRequest = useCallback(
    (e: React.MouseEvent, profilId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFriendRequestBlocked(profilId)) {
        return;
      }
      sendFriendRequest(profilId);
    },
    [isFriendRequestBlocked, sendFriendRequest],
  );

  const sorted = useMemo(
    () =>
      [...accessibleConversations].sort(
        (a, b) => conversationRecency(b) - conversationRecency(a),
      ),
    [accessibleConversations],
  );

  const favoriteConversationsStrip = useMemo(() => {
    const byId = new Map(accessibleConversations.map((c) => [c.id, c]));
    const list = favoriteConversationIds
      .map((id) => byId.get(id))
      .filter((c): c is Conversation => c !== undefined);
    return [...list].sort(
      (a, b) => conversationRecency(b) - conversationRecency(a),
    );
  }, [accessibleConversations, favoriteConversationIds]);

  const messagesTabBadge = useMemo(
    () => accessibleConversations.reduce((s, c) => s + c.unreadCount, 0),
    [accessibleConversations],
  );

  const profileVisitsVisible = useMemo(
    () =>
      profileVisits.filter((v) => !moderationHiddenProfilIds.includes(v.id)),
    [profileVisits, moderationHiddenProfilIds],
  );

  const visitesTabBadge = useMemo(
    () =>
      profileVisitsVisible.filter((v) => v.friendRequest).length +
      profileVisitsVisible.length,
    [profileVisitsVisible],
  );

  const suggestionsVisible = useMemo(
    () => suggestions.filter((s) => !moderationHiddenProfilIds.includes(s.id)),
    [suggestions, moderationHiddenProfilIds],
  );

  const sortedSuggestions = suggestionsVisible;

  const suggestionsListResetKey = useMemo(
    () => `${sortedSuggestions.length}-${moderationHiddenProfilIds.join(",")}`,
    [sortedSuggestions.length, moderationHiddenProfilIds],
  );

  const sortedVisits = useMemo(
    () =>
      [...profileVisitsVisible].sort((a, b) => {
        const ra = a.friendRequest ? 1 : 0;
        const rb = b.friendRequest ? 1 : 0;
        if (rb !== ra) return rb - ra;
        return b.lastVisitAt - a.lastVisitAt;
      }),
    [profileVisitsVisible],
  );

  const searchableUsers = useMemo(() => {
    const map = new Map<string, ChatUserHit>();
    for (const f of friends) {
      map.set(f.profilId, {
        id: f.profilId,
        label: f.pseudo || f.name,
        subtitle: f.city,
        avatarUrl: f.imageUrl,
      });
    }
    for (const s of suggestionsVisible) {
      if (!map.has(s.id)) {
        map.set(s.id, {
          id: s.id,
          label: s.pseudo,
          subtitle: `${s.age} ans`,
          avatarUrl: s.imageUrl,
        });
      }
    }
    for (const v of profileVisitsVisible) {
      if (!map.has(v.id)) {
        map.set(v.id, {
          id: v.id,
          label: v.name,
          subtitle: `${v.age} ans`,
          avatarUrl: v.avatarUrl,
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  }, [friends, suggestionsVisible, profileVisitsVisible]);

  const userSearchResults = useMemo(() => {
    const q = foldSearch(userSearchQuery.trim());
    if (!q) return [];
    return searchableUsers.filter((u) => userSearchHaystack(u).includes(q));
  }, [searchableUsers, userSearchQuery]);

  const handleSearchToggle = useCallback(() => {
    if (!viewerPremiumAccess) {
      showToast(t("chatUserSearchPremiumOnly"));
      return;
    }
    setUserSearchOpen((open) => {
      if (open) setUserSearchQuery("");
      return !open;
    });
  }, [viewerPremiumAccess, showToast, t]);

  const closeUserSearch = useCallback(() => {
    setUserSearchOpen(false);
    setUserSearchQuery("");
  }, []);

  return (
    <div className="chat-page">
      {/* Header gradient with favorite conversations */}
      <div className="chat-header-gradient">
        <div className="favorites-section">
          <p className="favorites-title">{t("favoriteChatConversations")}</p>
          <div className="stories-wrap">
            <div className="stories-scroll">
              {favoriteConversationsStrip.map((c) => (
                <FavoriteStripItem key={c.id} conversation={c} />
              ))}
              <NewGroupStripItem />
            </div>
            <div className="stories-right-fade" />
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="sub-tab-bar">
        {userSearchOpen && viewerPremiumAccess ? (
          <div className="chat-user-search-wrap">
            <Search size={20} color="#8E8E93" aria-hidden />
            <input
              ref={userSearchInputRef}
              type="search"
              className="chat-user-search-input"
              placeholder={t("chatUserSearchPlaceholder")}
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              aria-label={t("chatUserSearchPlaceholder")}
            />
            <button
              type="button"
              className="chat-user-search-close"
              onClick={closeUserSearch}
              aria-label={t("cancel")}
            >
              <X size={22} color="#8E8E93" />
            </button>
          </div>
        ) : (
          <>
            <div className="sub-tab-scroll">
              <SubTabPill
                label={t("chatMessages")}
                active={sub === "messages"}
                onPress={() => setSub("messages")}
                badge={messagesTabBadge}
                badgeVariant="red"
              />
              <SubTabPill
                label={t("chatSuggestions")}
                active={sub === "suggestions"}
                onPress={() => setSub("suggestions")}
              />
              <SubTabPill
                label={t("chatVisits")}
                active={sub === "visites"}
                onPress={() => setSub("visites")}
                badge={visitesTabBadge}
                badgeVariant="gold"
                icon={Eye}
              />
            </div>
            <button
              type="button"
              className={`search-btn-small${viewerPremiumAccess ? "" : " search-btn-small--locked"}`}
              aria-label={t("searchButton")}
              onClick={handleSearchToggle}
            >
              {viewerPremiumAccess ? (
                <Search size={22} color="#8E8E93" />
              ) : (
                <>
                  <Search
                    size={22}
                    color="#8E8E93"
                    className="search-btn-small-icon--disabled"
                    aria-hidden
                  />
                  <Crown size={20} color="#FFD60A" aria-hidden />
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="chat-content" ref={chatContentRef}>
        {userSearchOpen && viewerPremiumAccess ? (
          <div className="chat-user-search-results">
            {userSearchQuery.trim() === "" ? (
              <p className="chat-user-search-hint">{t("chatUserSearchHint")}</p>
            ) : userSearchResults.length === 0 ? (
              <p className="chat-user-search-hint">{t("chatUserSearchNoResults")}</p>
            ) : (
              userSearchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="chat-user-search-row"
                  onClick={() => {
                    closeUserSearch();
                    openDetail("profile", u.id);
                  }}
                >
                  <img src={u.avatarUrl} alt="" className="chat-user-search-avatar" />
                  <div className="chat-user-search-text">
                    <span className="chat-user-search-name">{u.label}</span>
                    <span className="chat-user-search-sub">{u.subtitle}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {sub === "messages" && (
              <div className="conv-list">
                {sorted.map((item) => (
                  <ConversationRow key={item.id} item={item} />
                ))}
              </div>
            )}

            {sub === "visites" && (
              <div className="visits-list">
            {/* Premium banner */}
            <div className="premium-banner">
              <div className="premium-banner-icon">
                <Crown size={28} color="#fff" />
              </div>
              <div className="premium-banner-texts">
                <span className="premium-banner-title">
                  {t("premiumFeature")}
                </span>
                <span className="premium-banner-sub">
                  {profileVisitsVisible.length} {t("visitsPlaceholder")}
                </span>
              </div>
            </div>
            {sortedVisits.map((v) => (
              <div
                key={v.id}
                className="visit-card"
                onClick={() => openDetail("profile", v.id)}
              >
                <div className="visit-avatar-wrap">
                  <img
                    src={v.avatarUrl}
                    alt={v.name}
                    className="visit-avatar"
                  />
                  {v.friendRequest && (
                    <span className="visit-friend-badge">
                      {t("friendRequestBadge")}
                    </span>
                  )}
                  {v.visitMultiplier && v.visitMultiplier > 1 && (
                    <span className="visit-mult-badge">
                      {t("visitMultiplier")}
                      {v.visitMultiplier}
                    </span>
                  )}
                </div>
                <div className="visit-card-body">
                  <span className="visit-name-age">
                    {v.name}, {v.age}
                  </span>
                  <div className="visit-meta-row">
                    <Eye size={14} color="#8E8E93" />
                    <span className="visit-time">
                      {formatVisitTimeAgo(v.lastVisitAt)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`visit-like-btn${hasSentFriendRequest(v.id) ? " visit-like-btn--sent" : ""}${isMutualFriend(v.id) ? " visit-like-btn--friend" : ""}${hasRejectedFriendRequest(v.id) ? " visit-like-btn--rejected" : ""}${dailyFriendRequestLimitReached && !hasSentFriendRequest(v.id) ? " visit-like-btn--daily-limit" : ""}`}
                  disabled={isFriendRequestBlocked(v.id)}
                  onClick={(e) => handleFriendRequest(e, v.id)}
                  aria-label={
                    isMutualFriend(v.id)
                      ? t("friendLabel")
                      : hasRejectedFriendRequest(v.id)
                        ? t("requestRejected")
                        : hasSentFriendRequest(v.id)
                          ? t("requestSent")
                          : dailyFriendRequestLimitReached
                            ? t("friendRequestDailyLimit")
                            : t("sendFriendRequest")
                  }
                >
                  {isMutualFriend(v.id) ? (
                    <Heart
                      size={18}
                      color="#FF4081"
                      fill="#FF4081"
                      aria-hidden
                    />
                  ) : hasRejectedFriendRequest(v.id) ? (
                    <HeartCrack size={18} color="#FF9F0A" aria-hidden />
                  ) : (
                    <UserPlus size={18} color="#fff" aria-hidden />
                  )}
                  <span>
                    {isMutualFriend(v.id)
                      ? t("friendLabel")
                      : hasRejectedFriendRequest(v.id)
                        ? t("rejectedRequest")
                        : hasSentFriendRequest(v.id)
                          ? t("sentRequest")
                          : t("addFriendButton")}
                  </span>
                </button>
              </div>
            ))}
              </div>
            )}

            {sub === "suggestions" && (
              <SuggestionsVirtualList
                suggestions={sortedSuggestions}
                scrollRef={chatContentRef}
                listResetKey={suggestionsListResetKey}
                loadingMoreLabel={t("chatSuggestionsLoadingMore")}
                emptyMessage={t("noSuggestions")}
                onOpenProfile={(id) => openDetail("profile", id)}
                isMutualFriend={isMutualFriend}
                hasSentFriendRequest={hasSentFriendRequest}
                hasRejectedFriendRequest={hasRejectedFriendRequest}
                dailyFriendRequestLimitReached={dailyFriendRequestLimitReached}
                isFriendRequestBlocked={isFriendRequestBlocked}
                onFriendRequest={handleFriendRequest}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
