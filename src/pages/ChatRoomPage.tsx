import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Image as ImageIcon, Video as VideoIcon, Heart, Eye, Settings, Calendar, Lock, XCircle } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import './ChatRoomPage.css';

interface ChatRoomPageProps {
  id: string;
}

export function ChatRoomPage({ id }: ChatRoomPageProps) {
  const { closeDetail, openDetail } = useNavigationStore();
  const { 
    conversations, 
    messagesByConversation, 
    sendMessage, 
    markAsRead, 
    toggleConversationFavorite,
    getEventByConversationId
  } = useMessagingStore();
  
  const conversation = conversations.find(c => c.id === id);
  const messages = messagesByConversation[id] || [];
  const linkedEvent = getEventByConversationId(id);
  
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    if (conversation && conversation.unreadCount > 0) {
      markAsRead(id);
    }
  }, [id, messages.length, markAsRead, conversation?.unreadCount]);

  if (!conversation) return null;

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(id, draft);
    setDraft('');
  };

  return (
    <div className="chat-room-page">
      <header className="cr-header">
        <button className="cr-back-btn" onClick={closeDetail}>
          <ChevronLeft size={28} />
        </button>
        
        <div className="cr-header-info">
          <div 
            className="cr-avatar" 
            style={{ background: `linear-gradient(45deg, ${conversation.avatarGradient[0]}, ${conversation.avatarGradient[1]})` }}
          >
            {conversation.type === 'dm' ? conversation.title[0] : 'G'}
          </div>
          <div className="cr-texts">
            <h3 className="cr-title">{conversation.title}</h3>
            <p className="cr-subtitle">
              {conversation.type === 'group' ? `${conversation.members.length} membres` : 'Message direct'}
            </p>
          </div>
        </div>

        <div className="cr-header-actions">
          <button 
            className="cr-icon-btn" 
            onClick={() => toggleConversationFavorite(id)}
          >
            <Heart 
              size={24} 
              fill={conversation.isFavorite ? '#FF4081' : 'none'} 
              color={conversation.isFavorite ? '#FF4081' : '#fff'} 
            />
          </button>
          
          {linkedEvent && (
            <button className="cr-event-btn" onClick={() => openDetail('event', linkedEvent.id)}>
              <Eye size={18} />
              <span>Voir</span>
            </button>
          )}

          <button 
            className="cr-icon-btn" 
            onClick={() => openDetail('chat_settings', id)}
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      <div className="cr-message-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={m.id} className={`cr-bubble-wrap ${m.isOwn ? 'own' : 'other'}`}>
            {!m.isOwn && <span className="cr-author">{m.authorName}</span>}
            <div className="cr-bubble">
              <p className="cr-text">{m.text}</p>
              <span className="cr-time">
                {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <footer className="cr-input-bar">
        <button className="cr-attach-btn"><ImageIcon size={24} /></button>
        <textarea 
          className="cr-input" 
          placeholder="Écrivez un message…" 
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
        />
        <button className="cr-send-btn" onClick={handleSend} disabled={!draft.trim()}>
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
