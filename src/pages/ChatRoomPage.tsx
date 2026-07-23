import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Send,
  Heart,
  Eye,
  Settings,
  Image as ImageIcon,
  UserPlus,
  CheckSquare,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { buildConversationMiniSlots } from "../lib/conversationMiniSlots";
import { buildEventGroupMembers } from "../lib/eventGroupMembers";
import { getProfessionalById } from "../store/useProsStore";
import { getChatSocket, setActiveChatConversationId } from "../lib/chatSync";
import { canWriteToConversationThread } from "../lib/messageThread";
import { eventHostedByViewer } from "../lib/eventHost";
import { ChatMessageText } from "../components/ChatMessageText";
import "./ChatRoomPage.css";

interface ChatRoomPageProps {
  id: string;
}

export function ChatRoomPage({ id }: ChatRoomPageProps) {
  const { closeDetail, openDetail } = useNavigationStore();
  const { t } = useTranslation();
  const {
    conversations,
    messagesByConversation,
    sendMessage,
    deleteMessagesFromConversation,
    markAsRead,
    recordConversationOpened,
    toggleConversationFavorite,
    getEventByConversationId,
    friends,
    suggestions,
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    ensureEventConversationRoster,
    isAdmin,
  } = useMessagingStore();
  const user = useAuthStore((s) => s.user);

  const conversation = conversations.find((c) => c.id === id);
  const messages = messagesByConversation[id] || [];
  const linkedEvent = getEventByConversationId(id);

  const [draft, setDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (linkedEvent) ensureEventConversationRoster(id);
  }, [id, linkedEvent?.id, linkedEvent?.registeredParticipantIds, ensureEventConversationRoster]);

  useEffect(() => {
    recordConversationOpened(id);
  }, [id, recordConversationOpened]);

  useEffect(() => {
    setActiveChatConversationId(id);
    markAsRead(id);
    const socket = getChatSocket();
    if (socket && socket.connected) {
      socket.emit("conversation:join", { conversationId: id });
    }
    return () => {
      const s = getChatSocket();
      if (s && s.connected) {
        s.emit("conversation:leave", { conversationId: id });
      }
      setActiveChatConversationId(null);
    };
  }, [id, markAsRead]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [id, messages.length]);

  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [id]);

  // Conversation disparue (quittée / supprimée) : retirer la salle + couches au-dessus
  // (sinon overlay full-screen transparent → plus de clics, footer masqué).
  useEffect(() => {
    if (conversation) return;
    const { detailStack, popDetails } = useNavigationStore.getState();
    const chatIndex = detailStack.findIndex(
      (d) => d.type === "chat" && d.id === id,
    );
    if (chatIndex < 0) return;
    popDetails(detailStack.length - chatIndex);
  }, [conversation, id]);

  if (!conversation) return null;

  const memberN =
    linkedEvent && user?.id
      ? buildEventGroupMembers(linkedEvent, {
          viewerId: user.id,
          viewerDisplayName: viewerProfileDisplayName,
          viewerAvatarUrl: viewerProfileAvatarUrl,
          friends,
          suggestions,
        }).length
      : (conversation.members?.length ?? 0);
  const isGroup = conversation.type === "group";
  const headerSlots = buildConversationMiniSlots(
    conversation,
    linkedEvent,
    friends,
    viewerProfileAvatarUrl,
    isGroup ? (memberN <= 2 ? 2 : 4) : 1,
    {
      viewerId: user?.id ?? null,
      viewerDisplayName: viewerProfileDisplayName,
      suggestions,
    },
  );

  const threadStillOpen = canWriteToConversationThread({
    messages,
    eventDateKey: linkedEvent?.dateKey,
  });
  const messagingBlocked = !!conversation.messagingBlocked;
  const isOrganizer = !!(
    linkedEvent &&
    eventHostedByViewer(linkedEvent, {
      id: user?.id ?? "",
      displayName: viewerProfileDisplayName,
    })
  );
  const canManageMessages = isAdmin || isOrganizer;
  const canBypassMessagingBlock = canManageMessages;
  const canWrite =
    threadStillOpen && (!messagingBlocked || canBypassMessagingBlock);

  const allSelected =
    messages.length > 0 && selectedIds.size === messages.length;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(messages.map((m) => m.id)));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmMsg =
      count === messages.length
        ? t("chatDeleteAllMessagesConfirm")
        : count === 1
          ? t("chatDeleteOneMessageConfirm")
          : t("chatDeleteMessagesConfirm").replace(
              "{count}",
              String(count),
            );
    if (!window.confirm(confirmMsg)) return;
    deleteMessagesFromConversation(id, [...selectedIds]);
    exitSelectMode();
  };

  const handleSend = () => {
    if (!canWrite || !draft.trim() || selectMode) return;
    sendMessage(id, draft);
    setDraft("");
  };

  const dmPeer = !isGroup
    ? conversation.members?.find((m) => !m.isSelf)
    : undefined;
  const peerProfilId = dmPeer?.profilId;
  const canOpenPeerProfile = !isGroup && !!peerProfilId;
  const canOpenLinkedEvent = isGroup && !!linkedEvent;
  const canOpenHeaderTarget = canOpenPeerProfile || canOpenLinkedEvent;

  const handleOpenPeerProfile = () => {
    if (!peerProfilId) return;
    if (getProfessionalById(peerProfilId)) {
      openDetail("pro", peerProfilId);
    } else {
      openDetail("profile", peerProfilId);
    }
  };

  const handleHeaderClick = () => {
    if (canOpenLinkedEvent && linkedEvent) {
      openDetail("event", linkedEvent.id);
      return;
    }
    handleOpenPeerProfile();
  };

  const headerAriaLabel = canOpenLinkedEvent
    ? `${t("viewEventButton")} ${linkedEvent!.title}`
    : `${t("viewProfileOf")} ${conversation.title}`;

  const headerInfoContent = (
    <>
      <div className="cr-avatar-badge-wrap">
        <div
          className="cr-avatar"
          style={{
            background: `linear-gradient(45deg, ${conversation.avatarGradient[0]}, ${conversation.avatarGradient[1]})`,
          }}
        >
        {isGroup ? (
          memberN <= 2 ? (
            <div className="cr-avatar-split">
              {[0, 1].map((i) => {
                const s = headerSlots[i];
                return (
                  <div key={i} className="cr-avatar-half">
                    {s?.hasImage && s.src ? (
                      <img
                        className="cr-avatar-slot-img"
                        src={s.src}
                        alt=""
                      />
                    ) : (
                      <div
                        className="cr-avatar-fallback"
                        style={{
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
          ) : (
            <div className="cr-avatar-grid">
              {[0, 1, 2, 3].map((i) => {
                const s = headerSlots[i];
                return (
                  <div key={i} className="cr-avatar-quad">
                    {s?.hasImage && s.src ? (
                      <img
                        className="cr-avatar-slot-img"
                        src={s.src}
                        alt=""
                      />
                    ) : (
                      <div
                        className="cr-avatar-fallback"
                        style={{
                          background: `rgba(255,255,255,${0.22 + i * 0.08})`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : headerSlots[0]?.hasImage && headerSlots[0].src ? (
          <img
            className="cr-avatar-dm-img"
            src={headerSlots[0].src}
            alt=""
          />
        ) : (
          <span className="cr-avatar-letter">
            {conversation.title.slice(0, 1)}
          </span>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <span className="cr-unread-badge" aria-hidden>
          {conversation.unreadCount}
        </span>
      )}
    </div>
      <div className="cr-texts">
        <h3 className="cr-title">{conversation.title}</h3>
        <p className="cr-subtitle">
          {selectMode
            ? `${selectedIds.size} ${t("chatSelectedCount")}`
            : isGroup
              ? `${conversation.memberCount ?? memberN} ${t("membersCount")}`
              : t("directMessageLabel")}
        </p>
      </div>
    </>
  );

  return (
    <div className={`chat-room-page${selectMode ? " chat-room-page--select" : ""}`}>
      <header className="cr-header">
        <button
          className="cr-back-btn"
          onClick={selectMode ? exitSelectMode : closeDetail}
          aria-label={selectMode ? t("chatSelectCancel") : undefined}
        >
          {selectMode ? (
            <X size={24} color="currentColor" />
          ) : (
            <ChevronLeft size={28} color="currentColor" />
          )}
        </button>

        {canOpenHeaderTarget && !selectMode ? (
          <button
            type="button"
            className="cr-header-info cr-header-info--clickable"
            onClick={handleHeaderClick}
            aria-label={headerAriaLabel}
          >
            {headerInfoContent}
          </button>
        ) : (
          <div className="cr-header-info">{headerInfoContent}</div>
        )}

        <div className="cr-header-actions">
          {selectMode ? (
            <>
              <button
                type="button"
                className="cr-icon-btn"
                onClick={handleSelectAll}
                aria-label={
                  allSelected ? t("chatDeselectAll") : t("chatSelectAll")
                }
                title={allSelected ? t("chatDeselectAll") : t("chatSelectAll")}
              >
                {allSelected ? (
                  <CheckSquare size={22} color="#7C9EFF" />
                ) : (
                  <Square size={22} color="#7C9EFF" />
                )}
              </button>
              <button
                type="button"
                className="cr-icon-btn cr-icon-btn--danger"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                aria-label={t("chatDeleteSelected")}
                title={t("chatDeleteSelected")}
              >
                <Trash2 size={22} color="#FF453A" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cr-icon-btn"
                onClick={() => toggleConversationFavorite(id)}
              >
                <Heart
                  size={24}
                  fill={conversation.isFavorite ? "#FF4081" : "none"}
                  color={conversation.isFavorite ? "#FF4081" : "currentColor"}
                />
              </button>

              {linkedEvent && (
                <button
                  type="button"
                  className="cr-event-btn"
                  onClick={() => openDetail("event", linkedEvent.id)}
                >
                  <Eye size={18} />
                  <span>{t("viewEventButton")}</span>
                </button>
              )}

              {canManageMessages && messages.length > 0 ? (
                <button
                  type="button"
                  className="cr-icon-btn"
                  onClick={() => setSelectMode(true)}
                  aria-label={t("chatSelectMessages")}
                  title={t("chatSelectMessages")}
                >
                  <CheckSquare size={22} color="#7C9EFF" />
                </button>
              ) : null}

              {isGroup && !linkedEvent ? (
                <button
                  type="button"
                  className="cr-icon-btn"
                  onClick={() => openDetail("chat_settings", id)}
                  aria-label={t("addMemberHint")}
                >
                  <UserPlus size={24} color="#7C9EFF" />
                </button>
              ) : null}

              <button
                type="button"
                className="cr-icon-btn"
                onClick={() => openDetail("chat_settings", id)}
              >
                <Settings size={24} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="cr-message-list" ref={listRef}>
        {messages.map((m) => {
          const selected = selectedIds.has(m.id);
          return (
            <div
              key={m.id}
              className={`cr-bubble-wrap ${m.isOwn ? "own" : "other"}${
                selectMode ? " cr-bubble-wrap--selectable" : ""
              }${selected ? " cr-bubble-wrap--selected" : ""}`}
              onClick={
                selectMode
                  ? () => toggleSelectMessage(m.id)
                  : undefined
              }
              role={selectMode ? "button" : undefined}
              tabIndex={selectMode ? 0 : undefined}
              onKeyDown={
                selectMode
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSelectMessage(m.id);
                      }
                    }
                  : undefined
              }
              aria-pressed={selectMode ? selected : undefined}
            >
              {selectMode ? (
                <span
                  className={`cr-select-check${selected ? " cr-select-check--on" : ""}`}
                  aria-hidden
                >
                  {selected ? (
                    <CheckSquare size={18} color="#7C9EFF" />
                  ) : (
                    <Square size={18} color="#8E8E93" />
                  )}
                </span>
              ) : null}
              <div className="cr-bubble-col">
                {!m.isOwn && <span className="cr-author">{m.authorName}</span>}
                <div className="cr-bubble">
                  <ChatMessageText text={m.text} />
                  <span className="cr-time">
                    {new Date(m.sentAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectMode ? (
        <footer className="cr-select-bar">
          <button
            type="button"
            className="cr-select-bar-btn"
            onClick={handleSelectAll}
          >
            {allSelected ? t("chatDeselectAll") : t("chatSelectAll")}
          </button>
          <button
            type="button"
            className="cr-select-bar-btn cr-select-bar-btn--danger"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Trash2 size={18} />
            <span>
              {t("chatDeleteSelected")}
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </span>
          </button>
        </footer>
      ) : (
        <footer className={`cr-input-bar${canWrite ? "" : " cr-input-bar--locked"}`}>
          {!canWrite ? (
            <p className="cr-thread-closed-hint">
              {messagingBlocked
                ? t("chatMessagingBlockedHint")
                : t("chatThreadClosedHint")}
            </p>
          ) : null}
          <button className="cr-attach-btn" disabled={!canWrite}>
            <ImageIcon size={24} />
          </button>
          <textarea
            className="cr-input"
            rows={1}
            placeholder={
              canWrite
                ? t("messageInputHint")
                : messagingBlocked
                  ? t("chatMessagingBlockedPlaceholder")
                  : t("chatThreadClosedPlaceholder")
            }
            value={draft}
            disabled={!canWrite}
            readOnly={!canWrite}
            onChange={(e) => canWrite && setDraft(e.target.value)}
            onKeyDown={(e) =>
              canWrite &&
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSend())
            }
          />
          <button
            className="cr-send-btn"
            onClick={handleSend}
            disabled={!canWrite || !draft.trim()}
          >
            <Send size={20} />
          </button>
        </footer>
      )}
    </div>
  );
}
