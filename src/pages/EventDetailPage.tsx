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
  Trash2,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../store/useAuthStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { isEventDateBeforeToday } from "../lib/eventDateKey";
import {
  effectiveViewerEventStatus,
  eventHostedByViewer,
  eventOrganizerUserId,
  resolveEventHostAvatar,
  resolveEventHostIsPro,
} from "../lib/eventHost";
import { buildEventGroupMembers } from "../lib/eventGroupMembers";
import { resolveEventPublicUrl } from "../lib/eventPublicUrl";
import { resolveAvatarUrl, DEFAULT_AVATAR_URL } from "../lib/avatarUrl";
import {
  KARMA_ATTENDANCE_REWARD,
  KARMA_JOIN_COST,
  VIEWER_KARMA_PARTICIPANT_ID,
} from "../lib/karma";
import { hasViewerProAccess } from "../lib/viewerEntitlements";
import {
  filterInviteProfiles,
  listAllAppProfiles,
  listInvitableProfiles,
} from "../lib/eventInvites";
import { ReportModal } from "../components/ReportModal";
import "./EventDetailPage.css";

type ParticipantSlot =
  | {
      kind: "host";
      imageUrl: string;
      name: string;
      profilId?: string;
      key: string;
    }
  | { kind: "viewer"; key: string }
  | {
      kind: "profile";
      profilId: string;
      imageUrl: string;
      name: string;
      key: string;
    };

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
    joinWaitlist,
    leaveWaitlist,
    approveWaitlistEntry,
    rejectWaitlistEntry,
    inviteProfilToEvent,
    inviteProfilsToEvent,
    suggestions,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
    showToast,
    validateEventParticipantPresent,
    submitOrganizerRating,
    finalizeEventOrganizerKarma,
    isAdmin,
    adminDeleteEvent,
    cancelEvent,
  } = useMessagingStore();
  const viewerProAccess = useMessagingStore(hasViewerProAccess);
  const user = useAuthStore((s) => s.user);
  const viewerContext = user
    ? { id: user.id, displayName: user.displayName }
    : null;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const event = events.find((e) => e.id === id);

  const waitlist = event?.waitlistEntries ?? [];
  const waitlistPending = waitlist.some((w) => w.reason === "en_attente");
  const waitlistOverflow = waitlist.some((w) => w.reason === "overflow");
  const viewerOnWaitlist = waitlist.some(
    (w) =>
      w.profilId === VIEWER_KARMA_PARTICIPANT_ID ||
      (!!user?.id && w.profilId === user.id),
  );

  const resolveWaitlistPhoto = (entry: (typeof waitlist)[number]) => {
    if (entry.imageUrl?.trim()) return resolveAvatarUrl(entry.imageUrl);
    if (entry.profilId) {
      const fromFriend = friends.find((f) => f.profilId === entry.profilId)?.imageUrl;
      if (fromFriend?.trim()) return resolveAvatarUrl(fromFriend);
    }
    return DEFAULT_AVATAR_URL;
  };

  const resolveWaitlistProfilId = (entry: (typeof waitlist)[number]) => {
    const pid = entry.profilId?.trim();
    if (pid && pid !== VIEWER_KARMA_PARTICIPANT_ID) return pid;
    const name = entry.name.trim();
    if (!name) return undefined;
    const fromFriend = friends.find(
      (f) => f.name === name || f.pseudo === name,
    );
    if (fromFriend) return fromFriend.profilId;
    const fromSuggestion = suggestions.find(
      (s) => s.name === name || s.pseudo === name,
    );
    return fromSuggestion?.id;
  };

  const eventConversation = useMemo(
    () => conversations.find((c) => c.id === event?.conversationId),
    [conversations, event?.conversationId],
  );

  const participantSlots = useMemo((): ParticipantSlot[] => {
    if (!event) return [];

    const roster = buildEventGroupMembers(event, {
      viewerId: viewerContext?.id ?? null,
      viewerDisplayName: viewerProfileDisplayName,
      viewerAvatarUrl: viewerProfileAvatarUrl,
      friends,
      suggestions,
    });
    const organizerId = eventOrganizerUserId(event);
    const slots: ParticipantSlot[] = [];

    for (const m of roster) {
      if (m.profilId && organizerId && m.profilId === organizerId) {
        slots.push({
          kind: "host",
          imageUrl: resolveAvatarUrl(m.avatarUrl),
          name: m.name,
          profilId: m.profilId,
          key: `host-${m.profilId}`,
        });
      } else if (m.isSelf) {
        slots.push({ kind: "viewer", key: "viewer" });
      } else if (m.profilId) {
        slots.push({
          kind: "profile",
          profilId: m.profilId,
          imageUrl: resolveAvatarUrl(m.avatarUrl),
          name: m.name,
          key: `m-${m.profilId}`,
        });
      }
    }

    return slots;
  }, [
    event,
    friends,
    suggestions,
    viewerContext,
    viewerProfileAvatarUrl,
    viewerProfileDisplayName,
  ]);

  const allAppProfiles = useMemo(
    () => listAllAppProfiles(friends, suggestions),
    [friends, suggestions],
  );

  const invitableProfiles = useMemo(() => {
    if (!event) return [];
    const pool = isAdmin
      ? allAppProfiles
      : allAppProfiles.filter((p) =>
          friends.some(
            (f) =>
              f.profilId === p.profilId && f.mutualFriend !== false,
          ),
        );
    return listInvitableProfiles(event, conversations, pool);
  }, [event, friends, suggestions, conversations, isAdmin, allAppProfiles]);

  const filteredInvitableProfiles = useMemo(
    () => filterInviteProfiles(invitableProfiles, inviteSearch),
    [invitableProfiles, inviteSearch],
  );

  useEffect(() => {
    if (!event) return;
    if (isEventDateBeforeToday(event.dateKey)) {
      finalizeEventOrganizerKarma(event.id);
    }
  }, [event, finalizeEventOrganizerKarma]);

  useEffect(() => {
    if (!event?.conversationId) return;
    useMessagingStore.getState().ensureEventConversationRoster(event.conversationId);
  }, [event?.id, event?.conversationId, event?.registeredParticipantIds]);

  if (!event) return null;

  const publicShareUrl = resolveEventPublicUrl(event);

  const viewerStatus = effectiveViewerEventStatus(event, viewerContext, {
    conversationMembers: eventConversation?.members,
  });
  const viewerHosts = eventHostedByViewer(event, viewerContext);
  const hostAvatar = resolveEventHostAvatar(event, viewerProfileAvatarUrl, viewerContext);
  const hostName = viewerHosts
    ? viewerProfileDisplayName
    : event.hostName?.trim() || "Organisateur";

  const hostIsPro = resolveEventHostIsPro(
    event,
    friends,
    viewerProAccess,
    viewerContext,
  );

  const isInscribed =
    viewerStatus === "inscrit" || viewerStatus === "organisateur";
  const isFull = event.participantCount >= event.participantMax;
  const isHostOrganizer = viewerStatus === "organisateur";
  const isPastEvent = isEventDateBeforeToday(event.dateKey);
  const canEditEvent = isHostOrganizer;
  const canInvite = (isHostOrganizer || isAdmin) && !isPastEvent;
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
    !isHostOrganizer && viewerStatus !== "inscrit" && !isFull && !isPastEvent;

  const markParticipantPresent = (participantProfilId: string) => {
    validateEventParticipantPresent(event.id, participantProfilId);
  };

  const handleInviteProfile = (profilId: string) => {
    inviteProfilToEvent(event.id, profilId);
  };

  const handleInviteAll = () => {
    if (invitableProfiles.length === 0) return;
    if (
      !window.confirm(
        t("adminInviteAllConfirm").replace(
          "{{n}}",
          String(invitableProfiles.length),
        ),
      )
    ) {
      return;
    }
    inviteProfilsToEvent(
      event.id,
      invitableProfiles.map((p) => p.profilId),
    );
    setInviteOpen(false);
    setInviteSearch("");
  };

  const handleDeleteEvent = () => {
    if (!window.confirm(t("deleteEventConfirmation"))) return;
    if (isAdmin) {
      adminDeleteEvent(event.id);
    } else {
      cancelEvent(event.id);
      showToast("Sortie supprimée.");
    }
    closeDetail();
  };

  const handleJoinToggle = () => {
    if (viewerStatus === "inscrit") {
      if (
        confirm("Voulez-vous vraiment vous désinscrire de cette activité ?")
      ) {
        leaveEvent(event.id);
      }
      return;
    }
    if (viewerStatus === "en_attente" || viewerOnWaitlist) {
      leaveWaitlist(event.id);
      return;
    }
    if (event.manualApproval || isFull) {
      joinWaitlist(event.id);
      return;
    }
    joinEvent(event.id);
  };

  const joinButtonLabel =
    viewerStatus === "inscrit"
      ? t("unregisterButton")
      : viewerStatus === "en_attente" || viewerOnWaitlist
        ? t("leaveWaitlist")
        : isFull
          ? t("joinWaitlist")
          : event.manualApproval
            ? t("joinWaitlist")
            : t("joinEventButton");

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
            {isHostOrganizer || isAdmin ? (
              <button
                type="button"
                className="ed-icon-btn ed-icon-btn--danger"
                onClick={handleDeleteEvent}
                aria-label={isAdmin ? t("adminDeleteEvent") : t("deleteEvent")}
              >
                <Trash2 size={22} color="#FF453A" />
              </button>
            ) : null}
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
              if (slot.kind === "host") {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className="ed-participant-avatar ed-participant-avatar--clickable"
                    onClick={() => {
                      if (slot.profilId && !eventHostedByViewer(event, viewerContext)) {
                        openDetail("profile", slot.profilId);
                      } else {
                        setActiveTab("profile");
                      }
                    }}
                    aria-label={`${t("viewProfileLabel")} ${slot.name}`}
                  >
                    <img src={slot.imageUrl} alt="" />
                  </button>
                );
              }
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
              return null;
            })}
            {event.participantCount < event.participantMax &&
              !isPastEvent &&
              (canInvite ? (
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
                const profileId = resolveWaitlistProfilId(w);
                const tag =
                  w.reason === "en_attente"
                    ? t("awaitingValidationTag")
                    : t("capacityFullTag");
                const showModeration =
                  (isHostOrganizer || isAdmin) &&
                  w.reason === "en_attente" &&
                  !isPastEvent;
                return (
                  <div key={w.id} className="ed-waitlist-row" role="listitem">
                    <div className="ed-waitlist-row-main">
                      <div className="ed-waitlist-row-inner">
                        {profileId ? (
                          <button
                            type="button"
                            className="ed-waitlist-av-btn"
                            onClick={() => openDetail("profile", profileId)}
                            aria-label={`${t("viewProfileLabel")} ${w.name}`}
                          >
                            <img src={photo} alt="" className="ed-waitlist-av" />
                          </button>
                        ) : (
                          <img src={photo} alt="" className="ed-waitlist-av" />
                        )}
                        <div className="ed-waitlist-texts">
                          <span className="ed-waitlist-name">{w.name}</span>
                          <span className="ed-waitlist-tag">{tag}</span>
                        </div>
                      </div>
                    </div>
                    {showModeration ? (
                      <div className="ed-waitlist-actions">
                        <button
                          type="button"
                          className="ed-waitlist-action ed-waitlist-action--approve"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            approveWaitlistEntry(event.id, w.id);
                          }}
                          aria-label={t("approveWaitlistEntry")}
                        >
                          <CheckCircle2 size={18} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ed-waitlist-action ed-waitlist-action--reject"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            rejectWaitlistEntry(event.id, w.id);
                          }}
                          aria-label={t("rejectWaitlistEntry")}
                        >
                          <X size={18} aria-hidden />
                        </button>
                      </div>
                    ) : null}
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
              {canEditEvent ? (
                <button
                  type="button"
                  className="ed-join-btn joined"
                  onClick={() => openDetail("event_create", event.id)}
                >
                  {t("editEventButton")}
                </button>
              ) : (
                <button
                  type="button"
                  className={`ed-join-btn${showJoinKarmaHint ? " ed-join-btn--with-karma" : ""} ${isInscribed ? "joined" : ""} ${!isInscribed && isFull && !viewerOnWaitlist && viewerStatus !== "en_attente" ? "full" : ""}`}
                  onClick={handleJoinToggle}
                  aria-label={
                    showJoinKarmaHint
                      ? viewerProAccess
                        ? `${t("joinEventButton")}, +${KARMA_ATTENDANCE_REWARD} karma si présence validée`
                        : `${t("joinEventButton")}, −${KARMA_JOIN_COST} karma, +${KARMA_ATTENDANCE_REWARD} karma si présence validée`
                      : undefined
                  }
                >
                  {viewerStatus === "inscrit" ? (
                    joinButtonLabel
                  ) : viewerStatus === "en_attente" || viewerOnWaitlist ? (
                    joinButtonLabel
                  ) : isFull && !event.manualApproval ? (
                    joinButtonLabel
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
              )}
            </>
          )}
          {isPastEvent && canEditEvent ? (
            <button
              type="button"
              className="ed-join-btn joined"
              onClick={() => openDetail("event_create", event.id)}
            >
              {t("editEventButton")}
            </button>
          ) : isPastEvent ? (
            <span className="ed-past-hint">{t("pastEventLabel")}</span>
          ) : null}
        </div>
      </footer>

      {inviteOpen && canInvite && (
        <>
          <button
            type="button"
            className="ed-invite-backdrop"
            aria-label={t("close")}
            onClick={() => {
              setInviteOpen(false);
              setInviteSearch("");
            }}
          />
          <div
            className="ed-invite-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ed-invite-title"
          >
            <div className="ed-invite-sheet-head">
              <h2 id="ed-invite-title" className="ed-invite-sheet-title">
                {isAdmin ? t("adminInviteSheetTitle") : t("inviteSheetTitle")}
              </h2>
              <button
                type="button"
                className="ed-invite-close"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setInviteOpen(false);
                  setInviteSearch("");
                }}
                aria-label={t("close")}
              >
                <X size={22} color="#8E8E93" />
              </button>
            </div>
            <p className="ed-invite-hint">
              {isAdmin ? t("adminInviteHint") : t("inviteHint")}
            </p>
            {isAdmin ? (
              <div className="ed-invite-toolbar">
                <input
                  type="search"
                  className="ed-invite-search"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder={t("adminInviteSearchPlaceholder")}
                />
                <button
                  type="button"
                  className="ed-invite-all-btn"
                  onClick={handleInviteAll}
                  disabled={invitableProfiles.length === 0}
                >
                  {t("adminInviteAll").replace(
                    "{{n}}",
                    String(invitableProfiles.length),
                  )}
                </button>
              </div>
            ) : null}
            <div className="ed-invite-list">
              {filteredInvitableProfiles.length === 0 ? (
                <p className="ed-invite-empty">
                  {inviteSearch.trim()
                    ? t("adminInviteSearchNoResults")
                    : t("adminInviteEmpty")}
                </p>
              ) : (
                filteredInvitableProfiles.map((p) => (
                  <button
                    key={p.profilId}
                    type="button"
                    className="ed-invite-row"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInviteProfile(p.profilId)}
                  >
                    <img src={p.imageUrl} alt="" className="ed-invite-av" />
                    <span className="ed-invite-name">{p.name}</span>
                    <span className="ed-invite-action">{t("inviteAction")}</span>
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
