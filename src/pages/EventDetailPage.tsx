import { useEffect, useMemo, useState } from "react";
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
  Award,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useTranslation } from "../i18n/useTranslation";
import { useMessagingStore } from "../store/useMessagingStore";
import { isEventDateBeforeToday } from "../lib/eventDateKey";
import { eventHostedByViewer, resolveEventHostIsPro } from "../lib/eventHost";
import { resolveEventPublicUrl } from "../lib/eventPublicUrl";
import {
  KARMA_ATTENDANCE_REWARD,
  KARMA_JOIN_COST,
  VIEWER_KARMA_PARTICIPANT_ID,
} from "../lib/karma";
import { hasViewerProAccess } from "../lib/viewerEntitlements";
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
    showToast,
    validateEventParticipantPresent,
    submitOrganizerRating,
    finalizeEventOrganizerKarma,
  } = useMessagingStore();
  const viewerProAccess = useMessagingStore(hasViewerProAccess);

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

  useEffect(() => {
    if (!event) return;
    if (isEventDateBeforeToday(event.dateKey)) {
      finalizeEventOrganizerKarma(event.id);
    }
  }, [event, finalizeEventOrganizerKarma]);

  if (!event) return null;

  const publicShareUrl = resolveEventPublicUrl(event);

  const viewerHosts = eventHostedByViewer(event);
  const hostAvatar = viewerHosts
    ? viewerProfileAvatarUrl
    : event.hostAvatar?.trim() || "https://i.pravatar.cc/150?u=nel-host";
  const hostName = viewerHosts
    ? viewerProfileDisplayName
    : event.hostName?.trim() || "Organisateur";

  const hostIsPro = resolveEventHostIsPro(
    event,
    friends,
    viewerProAccess,
  );

  const isInscribed =
    event.status === "inscrit" || event.status === "organisateur";
  const isFull = event.participantCount >= event.participantMax;
  const isHostOrganizer = viewerHosts && event.status === "organisateur";
  const isPastEvent = isEventDateBeforeToday(event.dateKey);
  const validatedPresent = new Set(event.validatedPresentProfilIds ?? []);
  const viewerValidatedPresent = validatedPresent.has(
    VIEWER_KARMA_PARTICIPANT_ID,
  );
  const myOrganizerRating = (event.organizerRatings ?? []).find(
    (r) => r.profilId === VIEWER_KARMA_PARTICIPANT_ID,
  )?.rating;
  const canRateOrganizer =
    isPastEvent &&
    !isHostOrganizer &&
    viewerValidatedPresent &&
    isInscribed;
  const showJoinKarmaHint =
    !isHostOrganizer && event.status !== "inscrit" && !isFull && !isPastEvent;

  const markParticipantPresent = (participantProfilId: string) => {
    validateEventParticipantPresent(event.id, participantProfilId);
  };

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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      showToast(t("linkCopied"));
    } catch {
      showToast(publicShareUrl);
    }

    if (!navigator.share) return;

    try {
      await navigator.share({
        title: event.title,
        text: event.notes,
        url: publicShareUrl,
      });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error(err);
      }
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
            aria-label={t("backButton")}
          >
            <ChevronLeft size={28} color="#fff" />
          </button>
          <div className="ed-header-actions">
            <button
              type="button"
              className="ed-icon-btn ed-share-btn"
              onClick={() => void handleShare()}
              aria-label={t("shareButton")}
              title={publicShareUrl}
            >
              <Share2 size={24} color="#fff" />
              <span className="ed-share-tooltip" role="tooltip">
                <span className="ed-share-tooltip-url">{publicShareUrl}</span>
                <span className="ed-share-tooltip-hint">{t("shareLinkTooltip")}</span>
              </span>
            </button>
            <button
              type="button"
              className="ed-icon-btn"
              onClick={() => toggleEventFavorite(event.id)}
              aria-label={
                event.isFavorite
                  ? t("removeFavoriteButton")
                  : t("addFavoriteButton")
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
              aria-label={t("reportButton")}
            >
              <AlertTriangle size={24} color="#FFCC00" />
            </button>
          </div>
        </header>

        <div className="ed-hero-content">
          <span className="ed-category">
            {event.category || t("defaultActivity")}
          </span>
          <h1 className="ed-title">{event.title}</h1>
          <div className="ed-host-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <img src={hostAvatar} alt={hostName} className="ed-host-avatar" />
            <span className="ed-host-name">
              {t("proposedByPrefix")} {hostName}
            </span>
            {hostIsPro && (
              <span className="ed-pro-badge" style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255, 214, 10, 0.15)",
                color: "#FFD60A",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                textTransform: "uppercase",
                border: "1px solid rgba(255, 214, 10, 0.25)"
              }}>
                <Award size={12} />
                <span>Pro</span>
              </span>
            )}
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
              <span className="ed-info-sub">{t("locationLabel")}</span>
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
              aria-label={`${event.participantCount} ${t("participantsCountAriaLabel")} sur ${event.participantMax}, ${waitlist.length} en liste d'attente`}
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
                {t("waitlistTitle")} · {waitlist.length}
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
                    aria-label={t("viewMyProfileButton")}
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
                const validated = validatedPresent.has(slot.profilId);
                return (
                  <div key={slot.key} className="ed-participant-slot">
                    <button
                      type="button"
                      className={`ed-participant-avatar ed-participant-avatar--clickable${validated ? " ed-participant-avatar--validated" : ""}`}
                      onClick={() => openDetail("profile", slot.profilId)}
                      aria-label={`${t("viewProfileLabel")} ${slot.name}`}
                    >
                      <img src={slot.imageUrl} alt="" />
                    </button>
                    {isHostOrganizer && !isPastEvent ? (
                      <button
                        type="button"
                        className={`ed-validate-present-btn${validated ? " ed-validate-present-btn--done" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!validated) markParticipantPresent(slot.profilId);
                        }}
                        aria-label={t("validatePresenceAriaLabel")}
                        disabled={validated}
                      >
                        <CheckCircle2 size={14} aria-hidden />
                      </button>
                    ) : null}
                  </div>
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
                  aria-label={t("inviteFriendsToEventButton")}
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
              <h2 className="ed-section-title">{t("waitlistTitle")}</h2>
              <span className="ed-count ed-count--sub">{waitlist.length}</span>
            </div>
            <p className="ed-waitlist-intro">
              {waitlistPending && waitlistOverflow
                ? t("waitlistBothPendingAndOverflow")
                : waitlistPending
                  ? event.manualApproval
                    ? t("waitlistAwaitingValidation")
                    : t("waitlistManualApproval")
                  : t("waitlistOverflowOnly")}
            </p>
            <div className="ed-waitlist-list" role="list">
              {waitlist.map((w) => {
                const photo = resolveWaitlistPhoto(w);
                const tag =
                  w.reason === "en_attente"
                    ? t("awaitingValidationTag")
                    : t("capacityFullTag");
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
                        aria-label={`${t("viewProfileLabel")} ${w.name}`}
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

        {canRateOrganizer && (
          <div className="ed-section ed-rate-organizer-section">
            <h2 className="ed-section-title">{t("rateOrganizerTitle")}</h2>
            <p className="ed-rate-organizer-sub">{t("rateOrganizerSubtitle")}</p>
            {myOrganizerRating ? (
              <p className="ed-rate-organizer-done">{t("rateOrganizerThanks")}</p>
            ) : (
              <div className="ed-rate-organizer-actions">
                <button
                  type="button"
                  className="ed-rate-organizer-btn ed-rate-organizer-btn--good"
                  onClick={() => submitOrganizerRating(event.id, "good")}
                  aria-label={t("rateOrganizerGoodAria")}
                >
                  <ThumbsUp size={20} aria-hidden />
                  <span>{t("rateOrganizerGood")}</span>
                </button>
                <button
                  type="button"
                  className="ed-rate-organizer-btn ed-rate-organizer-btn--bad"
                  onClick={() => submitOrganizerRating(event.id, "bad")}
                  aria-label={t("rateOrganizerBadAria")}
                >
                  <ThumbsDown size={20} aria-hidden />
                  <span>{t("rateOrganizerBad")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {!isInscribed && !isPastEvent && (
          <div className="ed-warning-box">
            <Info size={18} color="#FF9F0A" />
            <p className="ed-warning-text">{t("mustJoinToViewMessages")}</p>
          </div>
        )}
      </div>

      <footer className="ed-footer">
        <div className="ed-footer-row">
          <div className="ed-price-info">
            <span className="ed-price-amount">{event.price}</span>
            <span className="ed-price-label">{t("pricePerPerson")}</span>
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
                className={`ed-join-btn${showJoinKarmaHint ? " ed-join-btn--with-karma" : ""} ${isInscribed || isHostOrganizer ? "joined" : ""} ${!isInscribed && !isHostOrganizer && isFull ? "full" : ""}`}
                onClick={
                  isHostOrganizer
                    ? () => openDetail("event_create", event.id)
                    : handleJoinToggle
                }
                disabled={!isHostOrganizer && !isInscribed && isFull}
                aria-label={
                  showJoinKarmaHint
                    ? viewerProAccess
                      ? `${t("joinEventButton")}, +${KARMA_ATTENDANCE_REWARD} karma si présence validée`
                      : `${t("joinEventButton")}, −${KARMA_JOIN_COST} karma, +${KARMA_ATTENDANCE_REWARD} karma si présence validée`
                    : undefined
                }
              >
                {isHostOrganizer ? (
                  t("editEventButton")
                ) : event.status === "inscrit" ? (
                  t("unregisterButton")
                ) : isFull ? (
                  t("completeEventButton")
                ) : (
                  <>
                    <span className="ed-join-btn-label">{t("joinEventButton")}</span>
                    {showJoinKarmaHint ? (
                      <span className="ed-join-btn-karma" aria-hidden>
                        {viewerProAccess
                          ? t("createEventKarmaFree")
                          : t("joinEventKarmaCost").replace(
                              "{cost}",
                              String(KARMA_JOIN_COST),
                            )}
                        {" · "}
                        {t("joinEventKarmaReward").replace(
                          "{reward}",
                          String(KARMA_ATTENDANCE_REWARD),
                        )}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            </>
          )}
          {isPastEvent && (
            <span className="ed-past-hint">{t("pastEventLabel")}</span>
          )}
        </div>
      </footer>

      {inviteOpen && isHostOrganizer && (
        <>
          <button
            type="button"
            className="ed-invite-backdrop"
            aria-label={t("close")}
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
                {t("inviteSheetTitle")}
              </h2>
              <button
                type="button"
                className="ed-invite-close"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInviteOpen(false)}
                aria-label={t("close")}
              >
                <X size={22} color="#8E8E93" />
              </button>
            </div>
            <p className="ed-invite-hint">{t("inviteHint")}</p>
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
