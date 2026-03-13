import { useState } from 'react';
import { Calendar, Heart, Users, Clock, Settings, Award, Globe, Shield, Crown, Check, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import './ProfilePage.css';

type ProfileTab = 'upcoming' | 'favorites' | 'friends' | 'past' | 'settings';

interface Badge {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  image: string;
  isFavorite?: boolean;
  participated?: boolean;
}

interface Friend {
  id: number;
  name: string;
  avatar: string;
  eventsInCommon: number;
}

const badges: Badge[] = [
  { id: 'punctual', name: 'Ponctuel', icon: Award },
  { id: 'organizer', name: 'Organisateur', icon: Award },
  { id: 'friendly', name: 'Amical', icon: Award },
  { id: 'explorer', name: 'Explorateur', icon: Award },
];

const upcomingEvents: Event[] = [];

const favoriteEvents: Event[] = [
  { id: 1, title: 'Session Photo', date: '1 janv.', time: '20:00', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200', isFavorite: true },
  { id: 2, title: 'Atelier Écriture', date: '1 janv.', time: '08:00', image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200', isFavorite: true },
  { id: 3, title: 'Atelier DIY', date: '1 janv.', time: '14:00', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200', isFavorite: true },
  { id: 4, title: 'Atelier Cocktails', date: '1 janv.', time: '08:00', image: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=200', isFavorite: true },
];

const pastEvents: Event[] = [
  { id: 5, title: 'Escape Game', date: '31 janv.', time: '17:00', image: 'https://images.unsplash.com/photo-1569863959165-56dae551d4fc?w=200', participated: true },
  { id: 6, title: "Tournoi d'Échecs", date: '31 janv.', time: '15:30', image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=200', participated: true },
  { id: 7, title: 'Session Photo', date: '31 janv.', time: '11:00', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200', participated: true },
  { id: 8, title: 'Session Photo', date: '31 janv.', time: '10:00', image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200', participated: true },
];

const friends: Friend[] = [
  { id: 1, name: 'Marie L.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', eventsInCommon: 12 },
  { id: 2, name: 'Lucas M.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', eventsInCommon: 8 },
  { id: 3, name: 'Emma R.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', eventsInCommon: 15 },
  { id: 4, name: 'Hugo D.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', eventsInCommon: 6 },
];

const tabCounts = {
  upcoming: 0,
  favorites: 173,
  friends: 6,
  past: 687,
};

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('upcoming');
  const [isPremium, setIsPremium] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
  const { isDarkMode, toggleTheme } = useThemeStore();

  const tabs: { id: ProfileTab; label: string; icon: React.ComponentType<any>; count?: number }[] = [
    { id: 'upcoming', label: 'À venir', icon: Calendar, count: tabCounts.upcoming },
    { id: 'favorites', label: 'Favoris', icon: Heart, count: tabCounts.favorites },
    { id: 'friends', label: 'Amis', icon: Users, count: tabCounts.friends },
    { id: 'past', label: 'Passés', icon: Clock, count: tabCounts.past },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upcoming':
        return (
          <div className="tab-content">
            {upcomingEvents.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} className="empty-icon" />
                <p>Aucun événement à venir.</p>
              </div>
            ) : (
              <div className="events-list">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="event-item">
                    <img src={event.image} alt={event.title} className="event-image" />
                    <div className="event-info">
                      <h3>{event.title}</h3>
                      <p>{event.date} · {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'favorites':
        return (
          <div className="tab-content">
            <div className="events-list">
              {favoriteEvents.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-image-wrapper">
                    <img src={event.image} alt={event.title} className="event-image" />
                    <span className="favorite-badge"><Heart size={12} fill="#fff" /></span>
                  </div>
                  <div className="event-info">
                    <h3>{event.title}</h3>
                    <p>{event.date} · {event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'friends':
        return (
          <div className="tab-content">
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                  <div className="friend-info">
                    <h3>{friend.name}</h3>
                    <p>{friend.eventsInCommon} événements en commun</p>
                  </div>
                  <button className="see-button">Voir</button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'past':
        return (
          <div className="tab-content">
            <div className="events-list">
              {pastEvents.map((event) => (
                <div key={event.id} className="event-item">
                  <img src={event.image} alt={event.title} className="event-image" />
                  <div className="event-info">
                    <h3>{event.title}</h3>
                    <p>
                      {event.date} · {event.time}
                      {event.participated && (
                        <span className="participated-badge">
                          <Check size={12} /> Participé
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="tab-content settings-content">
            <div className={`setting-card premium ${isPremium ? 'active' : ''}`}>
              <div className="setting-icon premium-icon">
                <Crown size={24} />
              </div>
              <div className="setting-info">
                <h3>Premium Activé</h3>
                <p>Toutes les fonctionnalités débloquées</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={isPremium} 
                  onChange={() => setIsPremium(!isPremium)} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-card">
              <div className="setting-icon admin-icon">
                <Shield size={24} />
              </div>
              <div className="setting-info">
                <h3>Admin Mode</h3>
                <p>Mode utilisateur standard</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={isAdmin} 
                  onChange={() => setIsAdmin(!isAdmin)} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-card">
              <div className="setting-icon theme-icon">
                {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
              </div>
              <div className="setting-info">
                <h3>Mode Sombre</h3>
                <p>{isDarkMode ? 'Thème sombre activé' : 'Thème clair activé'}</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={isDarkMode} 
                  onChange={toggleTheme} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-card">
              <div className="setting-icon language-icon">
                <Globe size={24} />
              </div>
              <div className="setting-info">
                <h3>Langue</h3>
                <p>Français</p>
              </div>
              <div className="language-buttons">
                <button 
                  className={`lang-btn ${language === 'FR' ? 'active' : ''}`}
                  onClick={() => setLanguage('FR')}
                >
                  FR
                </button>
                <button 
                  className={`lang-btn ${language === 'EN' ? 'active' : ''}`}
                  onClick={() => setLanguage('EN')}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <img 
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200" 
            alt="Profile"
          />
        </div>
        <h1 className="profile-name">Jean Dupont</h1>
        <p className="profile-location">Toulouse, France</p>
      </div>

      {/* Badges Section */}
      <div className="badges-section">
        <h2 className="section-title">Badges</h2>
        <div className="badges-scroll">
          {badges.map((badge) => (
            <div key={badge.id} className="badge-item">
              <Award size={18} className="badge-icon" />
              <span>{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`tab-count ${tab.id}`}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
