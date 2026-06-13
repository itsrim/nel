import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Send,
  Heart,
  Eye,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { buildConversationMiniSlots } from "../lib/conversationMiniSlots";
import { buildEventGroupMembers } from "../lib/eventGroupMembers";
import { getProfessionalById } from "../store/useProsStore";
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
  } = useMessagingStore();
  const user = useAuthStore((s) => s.user);

  const conversation = conversations.find((c) => c.id === id);
  const messages = messagesByConversation[id] || [];
  const linkedEvent = getEventByConversationId(id);

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (linkedEvent) ensureEventConversationRoster(id);
  }, [id, linkedEvent?.id, linkedEvent?.registeredParticipantIds, ensureEventConversationRoster]);

  useEffect(() => {
    recordConversationOpened(id);
  }, [id, recordConversationOpened]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    if (conversation && conversation.unreadCount > 0) {
      markAsRead(id);
    }
  }, [id, messages.length, markAsRead, conversation?.unreadCount]);

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

  const handleSend = () => {
    if (!draft.trim()) return;
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
          <ChevronLeft size={28} />
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
          <button
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
              <p className="cr-text">{m.text}</p>
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

      <footer className="cr-input-bar">
        <button className="cr-attach-btn">
          <ImageIcon size={24} />
        </button>
        <textarea
          className="cr-input"
          placeholder={t("messageInputHint")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), handleSend())
          }
        />
        <button
          className="cr-send-btn"
          onClick={handleSend}
          disabled={!draft.trim()}
        >
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
