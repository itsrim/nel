import { useState } from "react";
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  FlaskConical,
  UserPlus,
  ChevronDown,
  ChevronUp,
  UserMinus,
  LogOut,
  Trash2,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import { resolveMemberPhotoUrl } from "../lib/conversationMiniSlots";
import type { GroupMember } from "../data/mockData";
import "./ChatSettingsPage.css";

interface ChatSettingsPageProps {
  id: string;
}

export function ChatSettingsPage({ id }: ChatSettingsPageProps) {
  const { closeDetail, openDetail, setActiveTab, popDetails } =
    useNavigationStore();
  const { t } = useTranslation();
  const {
    conversations,
    friends,
    addMemberToGroup,
    removeMemberFromGroup,
    leaveConversation,
    updateConversationSettings,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
    isAdmin,
    adminDeleteConversation,
  } = useMessagingStore();

  const conversation = conversations.find((c) => c.id === id);
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const members = conversation.members || [];

  const muteSounds = !!conversation.muteSounds;
  const blockNotifications = !!conversation.blockNotifications;

  const handleLeave = () => {
    const title = isGroup ? t("leaveGroupLabel") : t("leaveConversationLabel");
    const confirmMessage = isGroup
      ? t("leaveGroupConfirmMessage")
      : t("leaveConversationConfirmMessage");
    if (confirm(confirmMessage)) {
      leaveConversation(id);
      closeDetail(); // Close settings
      // ChatRoom will automatically close because conversation is now undefined
    }
  };

  const handleAdminDeleteConversation = () => {
    if (!window.confirm(t("adminDeleteConversationConfirm"))) return;
    adminDeleteConversation(id);
    popDetails(2);
  };

  // ... (Previous logic for members remains same) ...
  const memberIds = new Set(members.map((m) => m.profilId).filter(Boolean));
  const invitableFriends = friends.filter((f) => !memberIds.has(f.profilId));

  const handleAddFriend = (f: any) => {
    addMemberToGroup(id, {
      id: `m-${f.profilId}`,
      name: f.name,
      avatarGradient: ["#7C9EFF", "#42A5F5"],
      isSelf: false,
      profilId: f.profilId,
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm(t("removeMemberConfirm"))) {
      removeMemberFromGroup(id, memberId);
    }
  };

  const handleMemberAvatarClick = (m: GroupMember) => {
    if (m.isSelf) {
      setActiveTab("profile");
      return;
    }
    if (m.profilId) {
      openDetail("profile", m.profilId);
    }
  };

  return (
    <div className="cs-container">
      <div className="cs-backdrop" onClick={closeDetail} />

      <div className="cs-panel">
        <header className="cs-header">
          <p className="cs-header-kicker">{t("chatSettingsTitle")}</p>
        </header>

        <div className="cs-scrollable">
          <div className="cs-section">
            <button
              className="cs-toggle-row"
              onClick={() =>
                updateConversationSettings(id, { muteSounds: !muteSounds })
              }
            >
              {muteSounds ? (
                <VolumeX size={22} color="#8E8E93" />
              ) : (
                <Volume2 size={22} color="#8E8E93" />
              )}
              <span className="cs-toggle-label">{t("muteSoundsLabel")}</span>
              <div className={`cs-toggle-switch ${muteSounds ? "on" : ""}`}>
                <div className="cs-toggle-thumb" />
              </div>
            </button>

            <button
              className="cs-toggle-row"
              onClick={() =>
                updateConversationSettings(id, {
                  blockNotifications: !blockNotifications,
                })
              }
            >
              {blockNotifications ? (
                <BellOff size={22} color="#8E8E93" />
              ) : (
                <Bell size={22} color="#8E8E93" />
              )}
              <span className="cs-toggle-label">
                {t("blockNotificationsLabel")}
              </span>
              <div
                className={`cs-toggle-switch ${blockNotifications ? "on" : ""}`}
              >
                <div className="cs-toggle-thumb" />
              </div>
            </button>
            {/* ... */}

            <button className="cs-test-btn">
              <FlaskConical size={18} color="#8E8E93" />
              <span>{t("simpleTestMessage")}</span>
            </button>
          </div>

          <div className="cs-section cs-members-section">
            <div className="cs-members-header">
              <span className="cs-section-title">
                {t("membersTitle")} ({members.length})
              </span>
              {isGroup && (
                <button
                  className="cs-add-btn"
                  onClick={() => setInviteSectionOpen(!inviteSectionOpen)}
                >
                  <UserPlus size={18} color="#7C9EFF" />
                  <span>{t("addMemberHint")}</span>
                  {inviteSectionOpen ? (
                    <ChevronUp size={16} color="#7C9EFF" />
                  ) : (
                    <ChevronDown size={16} color="#7C9EFF" />
                  )}
                </button>
              )}
            </div>

            {isGroup && inviteSectionOpen && (
              <div className="cs-invite-block">
                <p className="cs-invite-title">{t("inviteMembersTitle")}</p>
                {invitableFriends.length === 0 ? (
                  <p className="cs-invite-empty">{t("noMoreFriendsToAdd")}</p>
                ) : (
                  <div className="cs-friends-scroll">
                    {invitableFriends.map((f) => (
                      <div
                        key={f.profilId}
                        className="cs-friend-chip"
                        onClick={() => handleAddFriend(f)}
                      >
                        <div
                          className="cs-friend-avatar"
                          style={{
                            background: `linear-gradient(45deg, #7C9EFF, #42A5F5)`,
                          }}
                        >
                          {f.name[0]}
                        </div>
                        <span className="cs-friend-name">
                          {f.name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="cs-members-list">
              {members.map((m) => {
                const rawPhoto = resolveMemberPhotoUrl(
                  m,
                  friends,
                  viewerProfileAvatarUrl,
                );
                const photoUrl = rawPhoto?.trim() ? rawPhoto : undefined;
                const gradientBg = `linear-gradient(45deg, ${m.avatarGradient[0]}, ${m.avatarGradient[1]})`;
                const canOpenProfile = m.isSelf || !!m.profilId;
                const avatarClassBase = `cs-member-avatar${photoUrl ? " cs-member-avatar--photo" : ""}`;
                const avatarStyle = photoUrl
                  ? undefined
                  : { background: gradientBg };

                const avatarBody = photoUrl ? (
                  <img src={photoUrl} alt="" className="cs-member-avatar-img" />
                ) : (
                  m.name[0]
                );

                return (
                  <div key={m.id} className="cs-member-row">
                    {canOpenProfile ? (
                      <button
                        type="button"
                        className={`${avatarClassBase} cs-member-avatar--clickable`}
                        style={avatarStyle}
                        onClick={() => handleMemberAvatarClick(m)}
                        aria-label={
                          m.isSelf
                            ? t("viewMyProfileLabel")
                            : `${t("viewProfileLabel")} ${m.name}`
                        }
                      >
                        {avatarBody}
                      </button>
                    ) : (
                      <div className={avatarClassBase} style={avatarStyle}>
                        {avatarBody}
                      </div>
                    )}
                    <span className="cs-member-name">
                      {m.isSelf ? viewerProfileDisplayName : m.name}
                    </span>
                    {!m.isSelf && (
                      <div className="cs-member-actions">
                        <button className="cs-member-icon-btn">
                          <Bell size={20} color="#8E8E93" />
                        </button>
                        {isGroup && (
                          <button
                            className="cs-member-icon-btn"
                            onClick={() => handleRemoveMember(m.id)}
                          >
                            <UserMinus size={22} color="#FF453A" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cs-divider" />

          <button className="cs-leave-btn" onClick={handleLeave}>
            <LogOut size={22} color="#FF453A" />
            <span>
              {isGroup ? t("leaveGroupLabel") : t("leaveConversationLabel")}
            </span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              className="cs-leave-btn cs-leave-btn--admin"
              onClick={handleAdminDeleteConversation}
            >
              <Trash2 size={22} color="#FF453A" />
              <span>{t("adminDeleteConversation")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
