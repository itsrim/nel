import { useMemo, useState } from "react";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Users,
  UserPlus,
  Heart,
  MessageCircle,
  Share2,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useTranslation } from "../i18n/useTranslation";
import { useMessagingStore } from "../store/useMessagingStore";
import { isEventDateBeforeToday } from "../lib/eventDateKey";
import type { Friend } from "../data/mockData";
import { ReportModal } from "../components/ReportModal";
import "./EventDetailPage.css";

type ParticipantSlot =
  | { kind: "viewer"; key: string }
  | {
      kind: "profile";
      profilId: string;
      imageUrl: string;
      name: string;
      key: string;
    }
  | { kind: "anonymous"; seed: number; key: string };

interface EventDetailPageProps {
  id: string;
}

function initialFromDisplayName(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "M";
}

export function EventDetailPage({ id }: EventDetailPageProps) {
  const { closeDetail, openDetail, setActiveTab } = useNavigationStore();
  const { t } = useTranslation();
  const {
    events,
    conversations,
    friends,
    toggleEventFavorite,
    joinEvent,
    leaveEvent,
    inviteFriendToEvent,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
  } = useMessagingStore();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const event = events.find((e) => e.id === id);

  const waitlist = event?.waitlistEntries ?? [];
  const waitlistPending = waitlist.some((w) => w.reason === "en_attente");
  const waitlistOverflow = waitlist.some((w) => w.reason === "overflow");

  const resolveWaitlistPhoto = (entry: (typeof waitlist)[number]) => {
    if (entry.imageUrl?.trim()) return entry.imageUrl;
    if (entry.profilId) {
      return (
        friends.find((f) => f.profilId === entry.profilId)?.imageUrl ??
        `https://i.pravatar.cc/100?u=${encodeURIComponent(entry.profilId)}`
      );
    }
    return `https://i.pravatar.cc/100?u=${encodeURIComponent(entry.id)}`;
  };

  const participantSlots = useMemo((): ParticipantSlot[] => {
    if (!event) return [];
    const isInscribed =
      event.status === "inscrit" || event.status === "organisateur";
    const slots: ParticipantSlot[] = [];
    const othersLimit = Math.min(
      Math.max(0, event.participantCount - (isInscribed ? 1 : 0)),
      21,
    );
    if (isInscribed) {
      slots.push({ kind: "viewer", key: "viewer" });
    }
    const conv = conversations.find((c) => c.id === event.conversationId);
    const fromConv =
      conv?.members?.filter((m) => !m.isSelf && m.profilId) ?? [];
    let used = 0;
    for (const m of fromConv) {
      if (used >= othersLimit) break;
      const friend = friends.find((f) => f.profilId === m.profilId);
      const imageUrl =
        friend?.imageUrl ??
        `https://i.pravatar.cc/100?u=${encodeURIComponent(m.profilId!)}`;
      slots.push({
        kind: "profile",
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
        kind: "anonymous",
        seed: anon + (isInscribed ? 50 : 0),
        key: `anon-${anon}`,
      });
      anon++;
      used++;
    }
    return slots;
  }, [event, conversations, friends]);

  const invitableFriends = useMemo(() => {
    if (!event) return [];
    const conv = conversations.find((c) => c.id === event.conversationId);
    const memberIds = new Set(
      (conv?.members ?? [])
        .map((m) => m.profilId)
        .filter((pid): pid is string => Boolean(pid)),
    );
    const invited = new Set(event.invitedProfilIds ?? []);
    return friends.filter(
      (f) => !memberIds.has(f.profilId) && !invited.has(f.profilId),
    );
  }, [event, friends, conversations]);

  if (!event) return null;

  /** Anciennes sorties nel sans flag : hôte « Moi » / pravatar fixe. */
  const viewerHosts =
    event.hostedByViewer === true ||
    event.hostName === "Moi" ||
    (event.hostAvatar?.includes("nel-organizer") ?? false);
  const hostAvatar = viewerHosts
    ? viewerProfileAvatarUrl
    : event.hostAvatar?.trim() || "https://i.pravatar.cc/150?u=nel-host";
  const hostName = viewerHosts
    ? viewerProfileDisplayName
    : event.hostName?.trim() || "Organisateur";

  const isInscribed =
    event.status === "inscrit" || event.status === "organisateur";
  const isFull = event.participantCount >= event.participantMax;
  const isHostOrganizer = viewerHosts && event.status === "organisateur";
  const isPastEvent = isEventDateBeforeToday(event.dateKey);

  const handleInviteFriend = (f: Friend) => {
    inviteFriendToEvent(event.id, f);
  };

  const handleJoinToggle = () => {
    if (event.status === "inscrit") {
      if (
        confirm("Voulez-vous vraiment vous désinscrire de cette activité ?")
      ) {
        leaveEvent(event.id);
      }
    } else {
      joinEvent(event.id);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event.title,
          text: event.notes,
          url: window.location.href,
        })
        .catch(console.error);
    } else {
      alert("Lien copié dans le presse-papier !");
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
            <button
              type="button"
              className="ed-icon-btn"
              onClick={handleShare}
              aria-label="Partager"
            >
              <Share2 size={24} color="#fff" />
            </button>
            <button
              type="button"
              className="ed-icon-btn"
              onClick={() => toggleEventFavorite(event.id)}
              aria-label={
                event.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
              }
            >
              <Heart
                size={24}
                color={event.isFavorite ? "#FF2D55" : "#fff"}
                fill={event.isFavorite ? "#FF2D55" : "none"}
              />
            </button>
            <button
              type="button"
              className="ed-icon-btn"
              onClick={() => setReportOpen(true)}
              aria-label="Signaler cette sortie"
            >
              <AlertTriangle size={24} color="#FFCC00" />
            </button>
          </div>
        </header>

        <div className="ed-hero-content">
          <span className="ed-category">{event.category || "Activité"}</span>
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
            <div className="ed-info-icon">
              <Clock size={20} color="#FFD60A" />
            </div>
            <div className="ed-info-texts">
              <span className="ed-info-label">{event.timeShort}</span>
              <span className="ed-info-sub">{event.sectionDateLabel}</span>
            </div>
          </div>
          <div className="ed-info-item">
            <div className="ed-info-icon">
              <MapPin size={20} color="#FFD60A" />
            </div>
            <div className="ed-info-texts">
              <span className="ed-info-label">{event.location}</span>
              <span className="ed-info-sub">Paris, France</span>
            </div>
          </div>
        </div>

        <div className="ed-section">
          <h2 className="ed-section-title">{t("aboutActivity")}</h2>
          <p className="ed-description">
            {event.notes ||
              "Venez nombreux pour cette activité passionnante ! C\'est l\'occasion idéale de faire de nouvelles rencontres et de partager un bon moment ensemble."}
          </p>
        </div>

        <div className="ed-section">
          <div className="ed-section-header">
            <h2 className="ed-section-title">{t("participants")}</h2>
            <div
              className="ed-count-stack"
              aria-label={`${event.participantCount} inscrits sur ${event.participantMax}, ${waitlist.length} en liste d’attente`}
            >
              <span className="ed-count-pair">
                {event.participantCount ?? 0}/{event.participantMax ?? 0}
              </span>
              <span
                className={
                  waitlist.length > 0
                    ? "ed-count-wait-sub"
                    : "ed-count-wait-sub ed-count-wait-sub--quiet"
                }
              >
                Liste d’attente · {waitlist.length}
              </span>
            </div>
          </div>
          <div className="ed-participants-grid">
            {participantSlots.map((slot) => {
              if (slot.kind === "viewer") {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className="ed-participant-avatar ed-participant-avatar--clickable"
                    onClick={() => setActiveTab("profile")}
                    aria-label="Voir mon profil"
                  >
                    {viewerProfileAvatarUrl ? (
                      <img
                        src={viewerProfileAvatarUrl}
                        alt=""
                        className="ed-avatar-me-img"
                      />
                    ) : (
                      <div className="ed-avatar-me">
                        {initialFromDisplayName(viewerProfileDisplayName)}
                      </div>
                    )}
                  </button>
                );
              }
              if (slot.kind === "profile") {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className="ed-participant-avatar ed-participant-avatar--clickable"
                    onClick={() => openDetail("profile", slot.profilId)}
                    aria-label={`Voir le profil de ${slot.name}`}
                  >
                    <img src={slot.imageUrl} alt="" />
                  </button>
                );
              }
              return (
                <div
                  key={slot.key}
                  className="ed-participant-avatar"
                  aria-hidden
                >
                  <img
                    src={`https://i.pravatar.cc/100?u=p${slot.seed}`}
                    alt=""
                  />
                </div>
              );
            })}
            {event.participantCount < event.participantMax &&
              !isPastEvent &&
              (isHostOrganizer ? (
                <button
                  type="button"
                  className="ed-participant-placeholder ed-participant-placeholder--invite"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setInviteOpen(true)}
                  aria-label="Inviter des amis à cette sortie"
                >
                  <UserPlus size={20} color="#FFD60A" />
                </button>
              ) : (
                <div className="ed-participant-placeholder" aria-hidden>
                  <Users size={20} color="#8E8E93" />
                </div>
              ))}
          </div>
        </div>

        {waitlist.length > 0 && (
          <div className="ed-section ed-waitlist-section">
            <div className="ed-section-header">
              <h2 className="ed-section-title">Liste d’attente</h2>
              <span className="ed-count ed-count--sub">{waitlist.length}</span>
            </div>
            <p className="ed-waitlist-intro">
              {waitlistPending && waitlistOverflow
                ? "Certaines demandes attendent la validation de l’organisateur ; d’autres suivent alors que la capacité est atteinte."
                : waitlistPending
                  ? event.manualApproval
                    ? "Inscriptions soumises à validation par l’organisateur avant confirmation."
                    : "Demandes en attente de validation."
                  : t("maxCapacityReachedWaitlist")}
            </p>
            <div className="ed-waitlist-list" role="list">
              {waitlist.map((w) => {
                const photo = resolveWaitlistPhoto(w);
                const tag =
                  w.reason === "en_attente"
                    ? "En attente de validation"
                    : "Capacité complète";
                const inner = (
                  <>
                    <img src={photo} alt="" className="ed-waitlist-av" />
                    <div className="ed-waitlist-texts">
                      <span className="ed-waitlist-name">{w.name}</span>
                      <span className="ed-waitlist-tag">{tag}</span>
                    </div>
                  </>
                );
                return (
                  <div key={w.id} className="ed-waitlist-row" role="listitem">
                    {w.profilId ? (
                      <button
                        type="button"
                        className="ed-waitlist-row-inner ed-waitlist-row-inner--click"
                        onClick={() => openDetail("profile", w.profilId!)}
                        aria-label={`Voir le profil de ${w.name}`}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className="ed-waitlist-row-inner">{inner}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isInscribed && !isPastEvent && (
          <div className="ed-warning-box">
            <Info size={18} color="#FF9F0A" />
            <p className="ed-warning-text">
              Pour voir les messages de cette sortie, vous devez en faire
              partie.
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
                onClick={() => openDetail("chat", event.conversationId)}
                aria-label="Ouvrir la discussion"
              >
                <MessageCircle size={24} />
              </button>
              <button
                type="button"
                className={`ed-join-btn ${isInscribed || isHostOrganizer ? "joined" : ""} ${!isInscribed && !isHostOrganizer && isFull ? "full" : ""}`}
                onClick={
                  isHostOrganizer
                    ? () => openDetail("event_create", event.id)
                    : handleJoinToggle
                }
                disabled={!isHostOrganizer && !isInscribed && isFull}
              >
                {isHostOrganizer
                  ? "Modifier la sortie"
                  : event.status === "inscrit"
                    ? "Se désinscrire"
                    : isFull
                      ? "Complet"
                      : "Participer"}
              </button>
            </>
          )}
          {isPastEvent && <span className="ed-past-hint">Sortie passée</span>}
        </div>
      </footer>

      {inviteOpen && isHostOrganizer && (
        <>
          <button
            type="button"
            className="ed-invite-backdrop"
            aria-label="Fermer"
            onClick={() => setInviteOpen(false)}
          />
          <div
            className="ed-invite-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ed-invite-title"
          >
            <div className="ed-invite-sheet-head">
              <h2 id="ed-invite-title" className="ed-invite-sheet-title">
                Inviter des amis
              </h2>
              <button
                type="button"
                className="ed-invite-close"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInviteOpen(false)}
                aria-label="Fermer"
              >
                <X size={22} color="#8E8E93" />
              </button>
            </div>
            <p className="ed-invite-hint">
              Vos amis recevront une notification pour rejoindre cette sortie.
            </p>
            <div className="ed-invite-list">
              {invitableFriends.length === 0 ? (
                <p className="ed-invite-empty">
                  Tous vos amis sont déjà dans le groupe ou invités.
                </p>
              ) : (
                invitableFriends.map((f) => (
                  <button
                    key={f.profilId}
                    type="button"
                    className="ed-invite-row"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInviteFriend(f)}
                  >
                    <img src={f.imageUrl} alt="" className="ed-invite-av" />
                    <span className="ed-invite-name">{f.name}</span>
                    <span className="ed-invite-action">Inviter</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler cette sortie"
        kind="event"
        subjectId={event.id}
        subjectLabel={event.title}
      />
    </div>
  );
}
