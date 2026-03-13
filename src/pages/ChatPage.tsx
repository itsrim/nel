import { MessageCircle, Send, Search } from 'lucide-react';
import { useState } from 'react';
import './ChatPage.css';

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

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Logique d'envoi de message
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
      <header className="chat-list-header">
        <h1 className="page-title">Messages</h1>
        <button className="search-button" aria-label="Search">
          <Search size={20} />
        </button>
      </header>

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
    </div>
  );
}
