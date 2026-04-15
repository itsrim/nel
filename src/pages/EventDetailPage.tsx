import { useMemo } from 'react';
import { ChevronLeft, MapPin, Clock, Users, Heart, MessageCircle, Share2, Info } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { isEventDateBeforeToday } from '../lib/eventDateKey';
import './EventDetailPage.css';

type ParticipantSlot =
  | { kind: 'viewer'; key: string }
  | { kind: 'profile'; profilId: string; imageUrl: string; name: string; key: string }
  | { kind: 'anonymous'; seed: number; key: string };

interface EventDetailPageProps {
  id: string;
}

function initialFromDisplayName(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : 'M';
}

export function EventDetailPage({ id }: EventDetailPageProps) {
  const { closeDetail, openDetail, setActiveTab } = useNavigationStore();
  const {
    events,
    conversations,
    friends,
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
  const isPastEvent = isEventDateBeforeToday(event.dateKey);

  const participantSlots = useMemo((): ParticipantSlot[] => {
    const slots: ParticipantSlot[] = [];
    const othersLimit = Math.min(
      Math.max(0, event.participantCount - (isInscribed ? 1 : 0)),
      21,
    );
    if (isInscribed) {
      slots.push({ kind: 'viewer', key: 'viewer' });
    }
    const conv = conversations.find((c) => c.id === event.conversationId);
    const fromConv =
      conv?.members?.filter((m) => !m.isSelf && m.profilId) ?? [];
    let used = 0;
    for (const m of fromConv) {
      if (used >= othersLimit) break;
      const friend = friends.find((f) => f.profilId === m.profilId);
      const imageUrl =
        friend?.imageUrl ?? `https://i.pravatar.cc/100?u=${encodeURIComponent(m.profilId!)}`;
      slots.push({
        kind: 'profile',
        profilId: m.profilId!,
        imageUrl,
        name: m.name,
        key: `m-${m.profilId}`,
      });
      used++;
    }
    let anon = 0;
    while (used < othersLimit) {
      slots.push({
        kind: 'anonymous',
        seed: anon + (isInscribed ? 50 : 0),
        key: `anon-${anon}`,
      });
      anon++;
      used++;
    }
    return slots;
  }, [
    event.conversationId,
    event.participantCount,
    isInscribed,
    conversations,
    friends,
  ]);

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
          <button
            type="button"
            className="ed-back-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={closeDetail}
            aria-label="Retour"
          >
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
            {participantSlots.map((slot) => {
              if (slot.kind === 'viewer') {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className="ed-participant-avatar ed-participant-avatar--clickable"
                    onClick={() => setActiveTab('profile')}
                    aria-label="Voir mon profil"
                  >
                    {viewerProfileAvatarUrl ? (
                      <img
                        src={viewerProfileAvatarUrl}
                        alt=""
                        className="ed-avatar-me-img"
                      />
                    ) : (
                      <div className="ed-avatar-me">{initialFromDisplayName(viewerProfileDisplayName)}</div>
                    )}
                  </button>
                );
              }
              if (slot.kind === 'profile') {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className="ed-participant-avatar ed-participant-avatar--clickable"
                    onClick={() => openDetail('profile', slot.profilId)}
                    aria-label={`Voir le profil de ${slot.name}`}
                  >
                    <img src={slot.imageUrl} alt="" />
                  </button>
                );
              }
              return (
                <div key={slot.key} className="ed-participant-avatar" aria-hidden>
                  <img src={`https://i.pravatar.cc/100?u=p${slot.seed}`} alt="" />
                </div>
              );
            })}
            {event.participantCount < event.participantMax && !isPastEvent && (
              <div className="ed-participant-placeholder">
                <Users size={20} color="#8E8E93" />
              </div>
            )}
          </div>
        </div>

        {!isInscribed && !isPastEvent && (
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
          {!isPastEvent && (
            <>
              <button
                type="button"
                className="ed-chat-btn"
                onClick={() => openDetail('chat', event.conversationId)}
                aria-label="Ouvrir la discussion"
              >
                <MessageCircle size={24} />
              </button>
              <button
                type="button"
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
            </>
          )}
          {isPastEvent && <span className="ed-past-hint">Sortie passée</span>}
        </div>
      </footer>
    </div>
  );
}
