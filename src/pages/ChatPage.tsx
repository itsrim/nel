import { Send, Search, Plus, Eye, X, Crown, Heart, MessageCircle, SlidersHorizontal, MoreVertical, ThumbsDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import './ChatPage.css';

type ChatTab = 'messages' | 'visites' | 'suggestion';

interface Visitor {
  id: number;
  name: string;
  age: number;
  timeAgo: string;
  visitCount: number;
  avatar: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
  avatar?: string;
}

interface ChatRoom {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

interface SuggestionProfile {
  id: number;
  name: string;
  age: number;
  distance: string;
  tags: string[];
  image: string;
}

const suggestionProfiles: SuggestionProfile[] = [
  { id: 1, name: 'Jasmine', age: 32, distance: '1,2 km', tags: ['Jamais mariée', 'Master', 'Avocate', 'Paris', '168 cm'], image: 'sugg-1' },
  { id: 2, name: 'Nicole', age: 20, distance: '0,8 km', tags: ['Célibataire', 'Études', 'Designer', 'Lyon', '172 cm'], image: 'sugg-2' },
  { id: 3, name: 'Jiselle', age: 26, distance: '1,4 km', tags: ['Jamais mariée', 'Master', 'Avocate', 'Sydney', '168 cm'], image: 'sugg-3' },
  { id: 4, name: 'Priya', age: 28, distance: '2,1 km', tags: ['Célibataire', 'MBA', 'Consultante', 'Marseille', '165 cm'], image: 'sugg-4' },
];

const chatRooms: ChatRoom[] = [
  {
    id: 1,
    name: 'Rando D...',
    lastMessage: 'Salut ! On se retrouve où ?',
    time: '14:30',
    unread: 5,
    avatar: 'rando',
  },
  {
    id: 2,
    name: 'Randon...',
    lastMessage: 'Parfait, à demain !',
    time: '13:15',
    unread: 3,
    avatar: 'rando2',
  },
  {
    id: 3,
    name: 'Team Pa...',
    lastMessage: 'Le projet avance bien',
    time: '12:00',
    unread: 2,
    avatar: 'team',
  },
  {
    id: 4,
    name: 'Soirée J...',
    lastMessage: 'On se retrouve à 20h',
    time: '11:45',
    unread: 2,
    avatar: 'soiree',
  },
  {
    id: 5,
    name: 'Amis Pro',
    lastMessage: 'Merci pour l\'info !',
    time: '10:20',
    unread: 0,
    avatar: 'amis',
  },
];

const visitors: Visitor[] = [
  { id: 1, name: 'Maya', age: 18, timeAgo: 'Il y a 8 min', visitCount: 1, avatar: 'maya' },
  { id: 2, name: 'Lily', age: 23, timeAgo: 'Il y a 21 min', visitCount: 2, avatar: 'lily' },
  { id: 3, name: 'Chloé', age: 30, timeAgo: 'Il y a 1h', visitCount: 1, avatar: 'chloe' },
  { id: 4, name: 'Lola', age: 21, timeAgo: 'Il y a 3h', visitCount: 3, avatar: 'lola' },
  { id: 5, name: 'Emma', age: 25, timeAgo: 'Il y a 2 jours', visitCount: 1, avatar: 'emma' },
];

const messages: Message[] = [
  {
    id: 1,
    text: 'Salut ! Comment ça va ?',
    sender: 'other',
    time: '14:25',
  },
  {
    id: 2,
    text: 'Ça va bien merci ! Et toi ?',
    sender: 'me',
    time: '14:26',
  },
  {
    id: 3,
    text: 'Super ! On se retrouve où pour l\'événement ?',
    sender: 'other',
    time: '14:28',
  },
  {
    id: 4,
    text: 'Je propose qu\'on se retrouve à la station de métro',
    sender: 'me',
    time: '14:30',
  },
];

export function ChatPage() {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState<ChatTab>('messages');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionProfile | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput('');
    }
  };

  if (selectedRoom) {
    const room = chatRooms.find((r) => r.id === selectedRoom);
    return (
      <div className="chat-page">
        <header className="chat-header">
          <button
            className="back-button"
            onClick={() => setSelectedRoom(null)}
            aria-label="Back"
          >
            ←
          </button>
          <div className="chat-header-info">
            <div className="chat-avatar">{room?.name[0]}</div>
            <div>
              <h2 className="chat-name">{room?.name}</h2>
              <p className="chat-status">En ligne</p>
            </div>
          </div>
        </header>

        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'me' ? 'message-me' : 'message-other'}`}
            >
              <div className="message-content">
                <p className="message-text">{message.text}</p>
                <span className="message-time">{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="message-input-container">
          <input
            type="text"
            className="message-input"
            placeholder="Tapez un message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            aria-label="Send"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Groupes en haut - scroll horizontal + bouton nouveau chat */}
      <div className="chat-groups-section">
        <div className="chat-groups-scroll">
          {chatRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className="chat-group-bubble"
              onClick={() => setSelectedRoom(room.id)}
              aria-label={room.name}
            >
              <div className="chat-group-avatar-wrapper">
                <div className={`chat-group-avatar ${room.avatar}`} />
                {room.unread > 0 && (
                  <span className="chat-group-unread">{room.unread}</span>
                )}
              </div>
              <span className="chat-group-name">{room.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="chat-group-bubble chat-group-new"
            aria-label="Créer un nouveau chat"
          >
            <div className="chat-group-avatar-wrapper chat-group-avatar-plus">
              <Plus size={28} />
            </div>
            <span className="chat-group-name">Nouveau</span>
          </button>
        </div>
      </div>

      {/* Barre onglets + recherche qui s'agrandit dessus au clic sur la loupe */}
      <div className="chat-tabs-row">
        <div className="chat-tabs">
          <div className="chat-tabs-scroll">
            <button
              type="button"
              className={`chat-tab ${activeTab === 'suggestion' ? 'active' : ''}`}
              onClick={() => setActiveTab('suggestion')}
            >
              Suggestions
            </button>
            <button
              type="button"
              className={`chat-tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              Messages
              {chatRooms.some((r) => r.unread > 0) && (
                <span className="chat-tab-badge">
                  {chatRooms.reduce((s, r) => s + r.unread, 0)}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`chat-tab ${activeTab === 'visites' ? 'active' : ''}`}
              onClick={() => setActiveTab('visites')}
            >
              <Eye size={16} />
              Visites
              <span className="chat-tab-badge yellow">5</span>
            </button>
          </div>
          <button
            type="button"
            className="chat-tab chat-tab-search-icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Recherche"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Input search s'agrandit vers la gauche et se met dessus les onglets — rendu uniquement quand ouvert pour ne pas masquer la loupe */}
        {searchOpen && (
          <div className="chat-search-expand is-open">
            <div className="chat-search-bar-wrap">
              <Search size={20} className="chat-search-icon" aria-hidden />
              <input
                type="search"
                className="chat-search-input"
                placeholder="Rechercher un visiteur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
                aria-label="Rechercher un visiteur"
              />
              <button
                type="button"
                className="chat-search-close"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                aria-label="Fermer la recherche"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="chat-tab-content">
        {activeTab === 'messages' && (
          <div className="chat-rooms-list">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                className="chat-room-item"
                onClick={() => setSelectedRoom(room.id)}
              >
                <div className={`chat-room-avatar ${room.avatar}`}></div>
                <div className="chat-room-content">
                  <div className="chat-room-header">
                    <h3 className="chat-room-name">{room.name}</h3>
                    <span className="chat-room-time">{room.time}</span>
                  </div>
                  <div className="chat-room-footer">
                    <p className="chat-room-message">{room.lastMessage}</p>
                    {room.unread > 0 && (
                      <span className="chat-room-unread">{room.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'visites' && (
          <div className="chat-visites-panel">
            <div className="chat-premium-banner">
              <Crown size={24} className="chat-premium-crown" />
              <div className="chat-premium-text">
                <span className="chat-premium-title">Fonctionnalité Premium</span>
                <span className="chat-premium-subtitle">5 personnes ont visité votre profil</span>
              </div>
            </div>
            <ul className="chat-visitors-list">
              {visitors.map((visitor) => (
                  <li key={visitor.id} className="chat-visitor-item">
                    <div className="chat-visitor-avatar-wrap">
                      <div className={`chat-visitor-avatar ${visitor.avatar}`} />
                      {visitor.visitCount > 1 && (
                        <span className="chat-visitor-count">x{visitor.visitCount}</span>
                      )}
                    </div>
                    <div className="chat-visitor-info">
                      <span className="chat-visitor-name">{visitor.name}, {visitor.age}</span>
                      <span className="chat-visitor-time">
                        <Eye size={12} /> {visitor.timeAgo}
                      </span>
                    </div>
                    <button type="button" className="chat-visitor-like" aria-label="Like">
                      <Heart size={16} />
                      Like
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {activeTab === 'suggestion' && (
          <div className="chat-suggestions-panel">
            {selectedSuggestion ? (
              <div className="suggestion-detail">
                <div className={`suggestion-detail-image ${selectedSuggestion.image}`} />
                <div className="suggestion-detail-top">
                  <button type="button" className="suggestion-detail-close" onClick={() => setSelectedSuggestion(null)} aria-label="Fermer">
                    <X size={24} />
                  </button>
                  <div className="suggestion-detail-actions">
                    <button type="button" className="suggestion-action-btn suggestion-action-pass" aria-label="Refuser / Passer">
                      <ThumbsDown size={22} />
                    </button>
                    <button type="button" className="suggestion-action-btn suggestion-action-chat" aria-label="Chat">
                      <MessageCircle size={22} fill="currentColor" />
                    </button>
                    <button type="button" className="suggestion-action-btn suggestion-action-like" aria-label="J'aime">
                      <Heart size={22} fill="currentColor" />
                    </button>
                  </div>
                  <button type="button" className="suggestion-detail-menu" aria-label="Menu">
                    <MoreVertical size={24} />
                  </button>
                </div>
                <div className="suggestion-detail-dots">
                  <span className="active" /><span /><span /><span /><span />
                </div>
                <div className="suggestion-detail-info">
                  <h2 className="suggestion-detail-name">{selectedSuggestion.name}, {selectedSuggestion.age}</h2>
                  <p className="suggestion-detail-distance">{selectedSuggestion.distance} de vous</p>
                  <div className="suggestion-detail-tags">
                    {selectedSuggestion.tags.map((tag, i) => (
                      <span key={i} className="suggestion-detail-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button type="button" className="suggestion-filters-btn" aria-label="Filtres">
                  <SlidersHorizontal size={20} />
                  Filtres
                </button>
                <div className="suggestion-grid">
                  {suggestionProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      className="suggestion-card"
                      onClick={() => setSelectedSuggestion(profile)}
                    >
                      <div className={`suggestion-card-image ${profile.image}`} />
                      <div className="suggestion-card-footer">
                        <span className="suggestion-card-name">{profile.name}, {profile.age}</span>
                        <span className="suggestion-card-chat" aria-hidden>
                          <MessageCircle size={20} fill="currentColor" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
