import { useState, useMemo } from 'react';
import { 
  Volume2, VolumeX, Bell, BellOff, FlaskConical, 
  UserPlus, ChevronDown, ChevronUp, UserMinus, LogOut 
} from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import './ChatSettingsPage.css';

interface ChatSettingsPageProps {
  id: string;
}

export function ChatSettingsPage({ id }: ChatSettingsPageProps) {
  const { closeDetail, openDetail } = useNavigationStore();
  const {
    conversations,
    friends,
    addMemberToGroup,
    removeMemberFromGroup,
    leaveConversation,
    updateConversationSettings,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
  } = useMessagingStore();
  
  const conversation = conversations.find(c => c.id === id);
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.type === 'group';
  const members = conversation.members || [];
  
  const muteSounds = !!conversation.muteSounds;
  const blockNotifications = !!conversation.blockNotifications;

  const handleLeave = () => {
    const title = isGroup ? 'Quitter le groupe' : 'Quitter la conversation';
    if (confirm(`Voulez-vous vraiment ${isGroup ? 'quitter ce groupe' : 'quitter cette conversation'} ?`)) {
      leaveConversation(id);
      closeDetail(); // Close settings
      // ChatRoom will automatically close because conversation is now undefined
    }
  };

  // ... (Previous logic for members remains same) ...
  const memberIds = new Set(members.map(m => m.profilId).filter(Boolean));
  const invitableFriends = friends.filter(f => !memberIds.has(f.profilId));

  const handleAddFriend = (f: any) => {
    addMemberToGroup(id, {
      id: `m-${f.profilId}`,
      name: f.name,
      avatarGradient: ['#7C9EFF', '#42A5F5'],
      isSelf: false,
      profilId: f.profilId
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Voulez-vous vraiment retirer ce membre du groupe ?')) {
      removeMemberFromGroup(id, memberId);
    }
  };

  return (
    <div className="cs-container">
      <div className="cs-backdrop" onClick={closeDetail} />
      
      <div className="cs-panel">
        <header className="cs-header">
          <p className="cs-header-kicker">PARAMÈTRES DE DISCUSSION</p>
        </header>

        <div className="cs-scrollable">
          <div className="cs-section">
            <button className="cs-toggle-row" onClick={() => updateConversationSettings(id, { muteSounds: !muteSounds })}>
              {muteSounds ? <VolumeX size={22} color="#8E8E93" /> : <Volume2 size={22} color="#8E8E93" />}
              <span className="cs-toggle-label">Couper les sons</span>
              <div className={`cs-toggle-switch ${muteSounds ? 'on' : ''}`}>
                <div className="cs-toggle-thumb" />
              </div>
            </button>

            <button className="cs-toggle-row" onClick={() => updateConversationSettings(id, { blockNotifications: !blockNotifications })}>
              {blockNotifications ? <BellOff size={22} color="#8E8E93" /> : <Bell size={22} color="#8E8E93" />}
              <span className="cs-toggle-label">Bloquer les notifications</span>
              <div className={`cs-toggle-switch ${blockNotifications ? 'on' : ''}`}>
                <div className="cs-toggle-thumb" />
              </div>
            </button>
            {/* ... */}

            <button className="cs-test-btn">
              <FlaskConical size={18} color="#8E8E93" />
              <span>Simuler un message entrant (test)</span>
            </button>
          </div>

          <div className="cs-section cs-members-section">
            <div className="cs-members-header">
              <span className="cs-section-title">MEMBRES ({members.length})</span>
              {isGroup && (
                <button className="cs-add-btn" onClick={() => setInviteSectionOpen(!inviteSectionOpen)}>
                  <UserPlus size={18} color="#7C9EFF" />
                  <span>+ un membre</span>
                  {inviteSectionOpen ? <ChevronUp size={16} color="#7C9EFF" /> : <ChevronDown size={16} color="#7C9EFF" />}
                </button>
              )}
            </div>

            {isGroup && inviteSectionOpen && (
              <div className="cs-invite-block">
                <p className="cs-invite-title">Inviter un ami</p>
                {invitableFriends.length === 0 ? (
                  <p className="cs-invite-empty">Tous vos amis sont déjà dans le groupe.</p>
                ) : (
                  <div className="cs-friends-scroll">
                    {invitableFriends.map(f => (
                      <div key={f.profilId} className="cs-friend-chip" onClick={() => handleAddFriend(f)}>
                        <div className="cs-friend-avatar" style={{ background: `linear-gradient(45deg, #7C9EFF, #42A5F5)` }}>
                          {f.name[0]}
                        </div>
                        <span className="cs-friend-name">{f.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="cs-members-list">
              {members.map(m => (
                <div key={m.id} className="cs-member-row">
                  <div
                    className={`cs-member-avatar${m.isSelf && viewerProfileAvatarUrl ? ' cs-member-avatar--photo' : ''}`}
                    style={
                      m.isSelf && viewerProfileAvatarUrl
                        ? undefined
                        : {
                            background: m.isSelf
                              ? '#78909C'
                              : `linear-gradient(45deg, ${m.avatarGradient[0]}, ${m.avatarGradient[1]})`,
                          }
                    }>
                    {m.isSelf && viewerProfileAvatarUrl ? (
                      <img src={viewerProfileAvatarUrl} alt="" className="cs-member-avatar-img" />
                    ) : (
                      m.name[0]
                    )}
                  </div>
                  <span className="cs-member-name">{m.isSelf ? viewerProfileDisplayName : m.name}</span>
                  {!m.isSelf && (
                    <div className="cs-member-actions">
                      <button className="cs-member-icon-btn"><Bell size={20} color="#8E8E93" /></button>
                      {isGroup && (
                        <button className="cs-member-icon-btn" onClick={() => handleRemoveMember(m.id)}>
                          <UserMinus size={22} color="#FF453A" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="cs-divider" />

          <button className="cs-leave-btn" onClick={handleLeave}>
            <LogOut size={22} color="#FF453A" />
            <span>{isGroup ? 'Sortir du groupe' : 'Quitter la conversation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
