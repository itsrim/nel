import { ChevronLeft, MapPin, Clock, Users, Heart, MessageCircle, Share2, Info } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import './EventDetailPage.css';

interface EventDetailPageProps {
  id: string;
}

function initialFromDisplayName(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : 'M';
}

export function EventDetailPage({ id }: EventDetailPageProps) {
  const { closeDetail, openDetail } = useNavigationStore();
  const {
    events,
    toggleEventFavorite,
    joinEvent,
    leaveEvent,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
  } = useMessagingStore();

  const event = events.find(e => e.id === id);

  if (!event) return null;

  /** Anciennes sorties nel sans flag : hôte « Moi » / pravatar fixe. */
  const viewerHosts =
    event.hostedByViewer === true ||
    event.hostName === 'Moi' ||
    event.hostAvatar.includes('nel-organizer');
  const hostAvatar = viewerHosts ? viewerProfileAvatarUrl : event.hostAvatar;
  const hostName = viewerHosts ? viewerProfileDisplayName : event.hostName;

  const isInscribed = event.status === 'inscrit' || event.status === 'organisateur';
  const isFull = event.participantCount >= event.participantMax;
  const isHostOrganizer = viewerHosts && event.status === 'organisateur';

  const handleJoinToggle = () => {
    if (event.status === 'inscrit') {
      if (confirm('Voulez-vous vraiment vous désinscrire de cette activité ?')) {
        leaveEvent(event.id);
      }
    } else {
      joinEvent(event.id);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.notes,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert('Lien copié dans le presse-papier !');
    }
  };

  return (
    <div className="event-detail-page">
      <div className="ed-hero">
        <img src={event.imageUri} alt={event.title} className="ed-hero-image" />
        <div className="ed-hero-gradient" />
        
        <header className="ed-header">
          <button className="ed-back-btn" onClick={closeDetail}>
            <ChevronLeft size={28} color="#fff" />
          </button>
          <div className="ed-header-actions">
            <button className="ed-icon-btn" onClick={handleShare}>
              <Share2 size={24} color="#fff" />
            </button>
            <button className="ed-icon-btn" onClick={() => toggleEventFavorite(event.id)}>
              <Heart size={24} color={event.isFavorite ? "#FF2D55" : "#fff"} fill={event.isFavorite ? "#FF2D55" : "none"} />
            </button>
          </div>
        </header>

        <div className="ed-hero-content">
          <span className="ed-category">{event.category || 'Activité'}</span>
          <h1 className="ed-title">{event.title}</h1>
          <div className="ed-host-row">
            <img src={hostAvatar} alt={hostName} className="ed-host-avatar" />
            <span className="ed-host-name">Proposé par {hostName}</span>
          </div>
        </div>
      </div>

      <div className="ed-content">
        <div className="ed-info-card">
          <div className="ed-info-item">
            <div className="ed-info-icon"><Clock size={20} color="#FFD60A" /></div>
            <div className="ed-info-texts">
              <span className="ed-info-label">{event.timeShort}</span>
              <span className="ed-info-sub">{event.sectionDateLabel}</span>
            </div>
          </div>
          <div className="ed-info-item">
            <div className="ed-info-icon"><MapPin size={20} color="#FFD60A" /></div>
            <div className="ed-info-texts">
              <span className="ed-info-label">{event.location}</span>
              <span className="ed-info-sub">Paris, France</span>
            </div>
          </div>
        </div>

        <div className="ed-section">
          <h2 className="ed-section-title">À propos de l'activité</h2>
          <p className="ed-description">{event.notes || "Venez nombreux pour cette activité passionnante ! C\'est l\'occasion idéale de faire de nouvelles rencontres et de partager un bon moment ensemble."}</p>
        </div>

        <div className="ed-section">
          <div className="ed-section-header">
            <h2 className="ed-section-title">Participants</h2>
            <span className="ed-count">{event.participantCount}/{event.participantMax}</span>
          </div>
          <div className="ed-participants-grid">
            {isInscribed && (
              <div className="ed-participant-avatar">
                {viewerProfileAvatarUrl ? (
                  <img
                    src={viewerProfileAvatarUrl}
                    alt=""
                    className="ed-avatar-me-img"
                  />
                ) : (
                  <div className="ed-avatar-me">{initialFromDisplayName(viewerProfileDisplayName)}</div>
                )}
              </div>
            )}
            {Array.from({ length: Math.min(event.participantCount - (isInscribed ? 1 : 0), 21) }).map((_, i) => (
              <div key={i} className="ed-participant-avatar">
                <img src={`https://i.pravatar.cc/100?u=p${i + (isInscribed ? 50 : 0)}`} alt="User" />
              </div>
            ))}
            {event.participantCount < event.participantMax && (
              <div className="ed-participant-placeholder">
                <Users size={20} color="#8E8E93" />
              </div>
            )}
          </div>
        </div>

        {!isInscribed && (
          <div className="ed-warning-box">
            <Info size={18} color="#FF9F0A" />
            <p className="ed-warning-text">
              Pour voir les messages de cette sortie, vous devez en faire partie.
            </p>
          </div>
        )}
      </div>

      <footer className="ed-footer">
        <div className="ed-footer-row">
          <div className="ed-price-info">
            <span className="ed-price-amount">{event.price}</span>
            <span className="ed-price-label">par personne</span>
          </div>
          <button className="ed-chat-btn" onClick={() => openDetail('chat', event.conversationId)}>
            <MessageCircle size={24} />
          </button>
          <button
            className={`ed-join-btn ${isInscribed || isHostOrganizer ? 'joined' : ''} ${!isInscribed && !isHostOrganizer && isFull ? 'full' : ''}`}
            onClick={isHostOrganizer ? () => openDetail('event_create', event.id) : handleJoinToggle}
            disabled={!isHostOrganizer && !isInscribed && isFull}
          >
            {isHostOrganizer
              ? 'Modifier la sortie'
              : event.status === 'inscrit'
                ? 'Se désinscrire'
                : isFull
                  ? 'Complet'
                  : 'Participer'}
          </button>
        </div>
      </footer>
    </div>
  );
}
