import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Send,
  Heart,
  Eye,
  Settings,
  Image as ImageIcon,
  UserPlus,
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
    markAsRead,
    recordConversationOpened,
    toggleConversationFavorite,
    getEventByConversationId,
    friends,
    suggestions,
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    ensureEventConversationRoster,
    addMemberToGroup,
  } = useMessagingStore();
  const user = useAuthStore((s) => s.user);

  const conversation = conversations.find((c) => c.id === id);
  const messages = messagesByConversation[id] || [];
  const linkedEvent = getEventByConversationId(id);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [draft, setDraft] = useState("");
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

  const canWrite = canWriteToConversationThread({
    messages,
    eventDateKey: linkedEvent?.dateKey,
  });

  const groupMembers = useMemo(() => {
    if (!conversation || !isGroup) return [];
    if (linkedEvent && user?.id) {
      return buildEventGroupMembers(linkedEvent, {
        viewerId: user.id,
        viewerDisplayName: viewerProfileDisplayName,
        viewerAvatarUrl: viewerProfileAvatarUrl,
        friends,
        suggestions,
      });
    }
    return conversation.members || [];
  }, [
    conversation,
    isGroup,
    linkedEvent,
    user?.id,
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    friends,
    suggestions,
  ]);

  const invitableFriends = useMemo(() => {
    const memberIds = new Set(groupMembers.map((m) => m.profilId).filter(Boolean));
    return friends.filter((f) => !memberIds.has(f.profilId));
  }, [groupMembers, friends]);

  const handleAddFriend = (profilId: string, name: string) => {
    addMemberToGroup(id, {
      id: `m-${profilId}`,
      name,
      avatarGradient: ["#7C9EFF", "#42A5F5"],
      isSelf: false,
      profilId,
    });
  };

  const handleSend = () => {
    if (!canWrite || !draft.trim()) return;
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
          {isGroup
            ? `${conversation.memberCount ?? memberN} ${t("membersCount")}`
            : t("directMessageLabel")}
        </p>
      </div>
    </>
  );

  return (
    <div className="chat-room-page">
      <header className="cr-header">
        <button className="cr-back-btn" onClick={closeDetail}>
          <ChevronLeft size={28} color="currentColor" />
        </button>

        {canOpenHeaderTarget ? (
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
          {isGroup ? (
            <div className="cr-invite-wrap">
              <button
                type="button"
                className="cr-add-member-btn"
                onClick={() => setInviteOpen((open) => !open)}
                aria-expanded={inviteOpen}
                aria-label={t("addMemberHint")}
              >
                <UserPlus size={18} color="#7C9EFF" />
                {/* <span>{t("addMemberHint")}</span> */}
              </button>
              {inviteOpen ? (
                <div className="cr-invite-dropdown">
                  <p className="cr-invite-title">{t("inviteMembersTitle")}</p>
                  {invitableFriends.length === 0 ? (
                    <p className="cr-invite-empty">{t("noMoreFriendsToAdd")}</p>
                  ) : (
                    <div className="cr-friends-scroll">
                      {invitableFriends.map((f) => (
                        <button
                          key={f.profilId}
                          type="button"
                          className="cr-friend-chip"
                          onClick={() => handleAddFriend(f.profilId, f.name)}
                        >
                          <div
                            className="cr-friend-avatar"
                            style={{
                              background: "linear-gradient(45deg, #7C9EFF, #42A5F5)",
                            }}
                          >
                            {f.name[0]}
                          </div>
                          <span className="cr-friend-name">
                            {f.name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="cr-icon-btn"
            onClick={() => toggleConversationFavorite(id)}
          >
            <Heart
              size={24}
              fill={conversation.isFavorite ? "#FF4081" : "none"}
              color={conversation.isFavorite ? "#FF4081" : "#fff"}
            />
          </button>

          {linkedEvent && (
            <button
              className="cr-event-btn"
              onClick={() => openDetail("event", linkedEvent.id)}
            >
              <Eye size={18} />
              <span>{t("viewEventButton")}</span>
            </button>
          )}

          <button
            className="cr-icon-btn"
            onClick={() => openDetail("chat_settings", id)}
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      <div className="cr-message-list" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`cr-bubble-wrap ${m.isOwn ? "own" : "other"}`}
          >
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
        ))}
      </div>

      <footer className={`cr-input-bar${canWrite ? "" : " cr-input-bar--locked"}`}>
        {!canWrite ? (
          <p className="cr-thread-closed-hint">{t("chatThreadClosedHint")}</p>
        ) : null}
        <button className="cr-attach-btn" disabled={!canWrite}>
          <ImageIcon size={24} />
        </button>
        <textarea
          className="cr-input"
          rows={1}
          placeholder={
            canWrite ? t("messageInputHint") : t("chatThreadClosedPlaceholder")
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
    </div>
  );
}
