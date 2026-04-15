import { useState, useMemo, useRef } from 'react';
import {
  Settings,
  Camera,
  ShieldCheck,
  Pencil,
  Calendar,
  Award,
  Heart,
  Users,
  AlertTriangle,
  Clock,
  Bell,
  X,
  Plus,
  Crown,
  Shield,
  Trash2,
  LogOut,
  Globe,
  FlaskConical,
  MessageCircle,
  EyeOff,
  ListChecks,
  User,
  Check
} from 'lucide-react';
import { useMessagingStore } from '../store/useMessagingStore';
import { EventCard } from '../components/EventCard';
import { getNelProfileImageKitUserKey, uploadLocalImageToImageKit } from '../lib/imagekitUpload';
import { withUrlUploadVersion } from '../lib/versionRemoteAssetUrl';
import './ProfilePage.css';

type TabId = 'favorites' | 'friends' | 'history' | 'notifications' | 'reports';

export function ProfilePage() {
  const { events, friends, toggleEventFavorite } = useMessagingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('favorites');
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mock user state
  const [displayName, setDisplayName] = useState('Jean J.');
  const [age, setAge] = useState('28');
  const [bio, setBio] = useState('Passionné de rando et de sorties culturelles sur Paris ! 🏔️🎭');
  const [heroImg, setHeroImg] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);

  const favoriteEvents = useMemo(() => events.filter(e => e.isFavorite), [events]);
  const historyEvents = useMemo(() => events.filter(e => e.status === 'inscrit' || e.status === 'organisateur'), [events]);
  const upcomingEvents = useMemo(() => events.filter(e => (e.status === 'inscrit' || e.status === 'organisateur' || e.status === 'en_attente')), [events]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file || !file.type.startsWith('image/')) {
      input.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      const userKey = getNelProfileImageKitUserKey();
      const url = await uploadLocalImageToImageKit({
        webFile: file,
        mimeType: file.type || null,
        userKey,
      });
      setHeroImg(withUrlUploadVersion(url));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.alert(`Échec de l’envoi de la photo : ${msg}`);
    } finally {
      setUploadingPhoto(false);
      input.value = '';
    }
  };

  const badges = [
    { id: 'punctual', label: 'Ponctuel', icon: Award },
    { id: 'organizer', label: 'Organisateur', icon: Award },
    { id: 'friendly', label: 'Amical', icon: Award },
    { id: 'explorer', label: 'Explorateur', icon: Award },
  ];

  return (
    <div className="profile-page">
      {/* Hero Section */}
      <div className="profile-hero">
        <img
          src={heroImg}
          alt="Profile"
          className="hero-img"
        />
        <div className="hero-overlay" />
        
        <div className="hero-top-btns">
          <button className="hero-icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings size={22} color="#fff" />
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="hero-icon-btn"
            onClick={handlePhotoClick}
            disabled={uploadingPhoto}
            aria-label="Change photo"
            aria-busy={uploadingPhoto}>
            <Camera size={22} color="#fff" style={{ opacity: uploadingPhoto ? 0.5 : 1 }} />
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept="image/*"
        />

        <div className="hero-bottom-info">
          {!editing ? (
            <h1 className="hero-name">{displayName}{age ? `, ${age}` : ''}</h1>
          ) : (
            <div className="hero-edit-fields">
              <input 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Nom"
                className="hero-input"
              />
              <input 
                value={age} 
                onChange={e => setAge(e.target.value)}
                placeholder="Âge"
                className="hero-input hero-input--small"
              />
            </div>
          )}
          <div className="verified-badge">
            <ShieldCheck size={16} color="#22C55E" />
            <span>Profil vérifié</span>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* Bio Card */}
        <div className="bio-card">
          {!editing ? (
            <p className="bio-text">{bio || '—'}</p>
          ) : (
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Bio..."
              className="bio-textarea"
            />
          )}
          <div className="bio-divider" />
          <div className="member-since">
            <Calendar size={16} color="#8E8E93" />
            <span>Membre depuis 2024</span>
          </div>
          <div className="bio-actions">
            {!editing ? (
              <button className="edit-btn" onClick={() => setEditing(true)}>
                <Pencil size={16} color="#FBBF24" />
                <span>Modifier le profil</span>
              </button>
            ) : (
              <div className="edit-save-cancel">
                <button className="cancel-btn" onClick={() => setEditing(false)}>Annuler</button>
                <button className="save-btn" onClick={() => setEditing(false)}>Enregistrer</button>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="section-title">Badges</div>
        <div className="badges-grid">
          {badges.map(b => (
            <div key={b.id} className="badge-chip">
              <span>{b.label}</span>
            </div>
          ))}
          <div className="badge-chip badge-chip--add">
            <Plus size={14} />
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-num" style={{ color: '#FBBF24' }}>4.8</span>
            <span className="stat-label">Fiabilité</span>
          </div>
          <div className="stat-item">
            <span className="stat-num" style={{ color: '#8B5CF6' }}>{upcomingEvents.length}</span>
            <span className="stat-label">À venir</span>
          </div>
          <div className="stat-item">
            <span className="stat-num" style={{ color: '#9CA3AF' }}>0</span>
            <span className="stat-label">No-shows</span>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="profile-tabs">
          <button className={`p-tab ${activeTab === 'favorites' ? 'p-tab--active' : ''}`} onClick={() => setActiveTab('favorites')}>
            <div className="p-tab-inner">
              <Heart size={18} color={activeTab === 'favorites' ? '#FF4B81' : '#8E8E93'} />
              <span>Favoris</span>
              <span className="p-tab-badge" style={{ background: '#FF4B81' }}>{favoriteEvents.length}</span>
            </div>
          </button>
          <button className={`p-tab ${activeTab === 'friends' ? 'p-tab--active' : ''}`} onClick={() => setActiveTab('friends')}>
            <div className="p-tab-inner">
              <Users size={18} color={activeTab === 'friends' ? '#8B5CF6' : '#8E8E93'} />
              <span>Amis</span>
              <span className="p-tab-badge" style={{ background: '#8B5CF6' }}>{friends.length}</span>
            </div>
          </button>
          {isAdmin && (
            <button className={`p-tab ${activeTab === 'reports' ? 'p-tab--active' : ''}`} onClick={() => setActiveTab('reports')}>
              <div className="p-tab-inner">
                <AlertTriangle size={18} color={activeTab === 'reports' ? '#EF4444' : '#8E8E93'} />
                <span>Signalements</span>
              </div>
            </button>
          )}
          <button className={`p-tab ${activeTab === 'history' ? 'p-tab--active' : ''}`} onClick={() => setActiveTab('history')}>
            <div className="p-tab-inner">
              <Clock size={18} color={activeTab === 'history' ? '#6B7280' : '#8E8E93'} />
              <span>Passés</span>
              <span className="p-tab-badge" style={{ background: '#6B7280' }}>{historyEvents.length}</span>
            </div>
          </button>
          <button className={`p-tab ${activeTab === 'notifications' ? 'p-tab--active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <div className="p-tab-inner">
              <Bell size={18} color={activeTab === 'notifications' ? '#5AC8FA' : '#8E8E93'} />
              <span>Notifications</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-container">
          {activeTab === 'favorites' && (
            <div className="favorites-list">
              {favoriteEvents.map(e => (
                <div key={e.id} className="p-event-row">
                  <img src={e.imageUri} alt={e.title} className="p-event-img" />
                  <div className="p-event-info">
                    <div className="p-event-title">{e.title}</div>
                    <div className="p-event-meta">{e.dateLabel} · {e.timeShort}</div>
                  </div>
                  <Heart size={20} fill="#FF4B81" color="#FF4B81" onClick={() => toggleEventFavorite(e.id)} style={{ cursor: 'pointer' }} />
                </div>
              ))}
              {favoriteEvents.length === 0 && <div className="empty-hint">Aucun favori pour le moment.</div>}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="friends-list">
              {friends.map(f => (
                <div key={f.profilId} className="friend-card">
                  <img src={f.imageUrl} alt={f.name} className="friend-av" />
                  <div className="friend-info">
                    <div className="friend-name">{f.name}</div>
                    <div className="friend-sub">
                      {f.age} ans · {f.city} · {f.eventsInCommon} communs
                    </div>
                  </div>
                  <button className="view-btn">Voir</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-list">
              {historyEvents.map(e => (
                <div key={e.id} className="p-event-row">
                  <img src={e.imageUri} alt={e.title} className="p-event-img" />
                  <div className="p-event-info">
                    <div className="p-event-title">{e.title}</div>
                    <div className="p-event-meta">{e.dateLabel} · {e.timeShort}</div>
                  </div>
                </div>
              ))}
              {historyEvents.length === 0 && <div className="empty-hint">Aucune activité passée.</div>}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Paramètres</h3>
              <button onClick={() => setSettingsOpen(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="setting-section">
                <div className="setting-item">
                  <div className="setting-icon gold"><Crown size={20} /></div>
                  <div className="setting-text">
                    <div className="setting-label">Premium</div>
                    <div className="setting-sub">Toutes les fonctionnalités débloquées</div>
                  </div>
                  <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} className="switch" />
                </div>
                <div className="setting-item">
                  <div className="setting-icon pink"><Shield size={20} color="#fff" /></div>
                  <div className="setting-text">
                    <div className="setting-label">Mode Admin</div>
                    <div className="setting-sub">Accès aux outils de modération</div>
                  </div>
                  <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="switch" />
                </div>
              </div>

              <div className="setting-section">
                <button className="setting-btn">
                  <Globe size={20} />
                  <span>Langue : Français</span>
                </button>
                <button className="setting-btn">
                  <FlaskConical size={20} />
                  <span>Activer les fonctionnalités Bêta</span>
                </button>
              </div>

              <div className="setting-section">
                <button className="setting-btn danger">
                  <LogOut size={20} />
                  <span>Se déconnecter</span>
                </button>
                <button className="setting-btn danger">
                  <Trash2 size={20} />
                  <span>Supprimer mon compte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
