import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Lock,
  FlaskConical,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import type { Event } from "../data/mockData";
import {
  getNelProfileImageKitUserKey,
  uploadLocalImageToImageKitEventCover,
} from "../lib/imagekitUpload";
import { withUrlUploadVersion } from "../lib/versionRemoteAssetUrl";
import { listAllAppProfiles } from "../lib/eventInvites";
import { hasViewerProAccess } from "../lib/viewerEntitlements";
import {
  KARMA_ORGANIZE_COST,
  KARMA_ORGANIZE_SUCCESS_REWARD,
} from "../lib/karma";
import {
  EVENT_PARTICIPANT_MIN_MAX,
  getEventParticipantMaxCap,
} from "../lib/eventParticipantLimits";
import {
  DEFAULT_EVENT_COVER_THEMES,
  findDefaultCoverThemeByImageUrl,
  type DefaultEventCoverTheme,
} from "../constants/defaultEventCoverThemes";
import "./CreateEventPage.css";

const MAX_TITLE_LEN = 50;
const MAX_DESCRIPTION_LEN = 300;
const MAX_LOCATION_LEN = 99;

function foldNorm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function toIsoDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function frenchShortDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** Même convention que `formatEventSectionTitle` / mock événements (jour + mois + année). */
function frenchSectionLabel(d: Date): string {
  const raw = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function roundDateToQuarterHour(d: Date): Date {
  const ms = 1000 * 60 * 15;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function dateFromEvent(ev: Event): Date {
  const p = ev.dateKey.split("-").map((x) => parseInt(x, 10));
  const y = p[0];
  const mo = p[1];
  const da = p[2];
  const time = ev.timeShort || "12:00";
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
    return new Date();
  }
  return new Date(
    y,
    mo - 1,
    da,
    Number.isFinite(hh) ? hh : 12,
    Number.isFinite(mm) ? mm : 0,
    0,
    0,
  );
}

/** Même logique que la fiche événement : sorties dont vous êtes l’organisateur affiché comme « vous ». */
function eventIsEditableByViewer(ev: Event): boolean {
  if (ev.status !== "organisateur") return false;
  return (
    ev.hostedByViewer === true ||
    ev.hostName === "Moi" ||
    (ev.hostAvatar?.includes("nel-organizer") ?? false)
  );
}

export interface CreateEventPageProps {
  /** `'new'` pour une création, sinon id d’événement à modifier. */
  formEventId: string;
}

export function CreateEventPage({ formEventId }: CreateEventPageProps) {
  const { closeDetail, popDetails } = useNavigationStore();
  const { t } = useTranslation();
  const {
    addEvent,
    updateEvent,
    cancelEvent,
    createEmptyGroup,
    postEventGroupWelcome,
    inviteProfilToEvent,
    isAdmin,
    suggestions,
    nelDemoIsPremium,
    viewerPremiumExpiresAt,
    viewerProfileIsPro,
    viewerProExpiresAt,
    getEventById,
    friends,
  } = useMessagingStore();
  const viewerProAccess = useMessagingStore(hasViewerProAccess);
  const entitlementState = useMemo(
    () => ({
      isAdmin,
      nelDemoIsPremium,
      viewerPremiumExpiresAt,
      viewerProfileIsPro,
      viewerProExpiresAt,
    }),
    [
      isAdmin,
      nelDemoIsPremium,
      viewerPremiumExpiresAt,
      viewerProfileIsPro,
      viewerProExpiresAt,
    ],
  );
  const participantMaxCap = useMemo(
    () => getEventParticipantMaxCap(entitlementState),
    [entitlementState],
  );

  const isEditMode = formEventId !== "new";

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(
    String(EVENT_PARTICIPANT_MIN_MAX),
  );
  const [eventDate, setEventDate] = useState(() =>
    roundDateToQuarterHour(new Date()),
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coverImageNonce, setCoverImageNonce] = useState(0);
  const [uploadingEventCover, setUploadingEventCover] = useState(false);
  const [hideAddress, setHideAddress] = useState(false);
  const [selectedInviteProfilIds, setSelectedInviteProfilIds] = useState<string[]>(
    [],
  );

  const inviteableProfiles = useMemo(() => {
    const all = listAllAppProfiles(friends, suggestions);
    if (isAdmin) return all;
    return all.filter((p) =>
      friends.some((f) => f.profilId === p.profilId && f.mutualFriend !== false),
    );
  }, [friends, suggestions, isAdmin]);

  const toggleInviteFriend = useCallback((profilId: string) => {
    setSelectedInviteProfilIds((prev) =>
      prev.includes(profilId)
        ? prev.filter((id) => id !== profilId)
        : [...prev, profilId],
    );
  }, []);

  const selectAllInviteFriends = useCallback(() => {
    setSelectedInviteProfilIds(inviteableProfiles.map((p) => p.profilId));
  }, [inviteableProfiles]);

  const clearInviteFriends = useCallback(() => {
    setSelectedInviteProfilIds([]);
  }, []);
  /** Coché = sortie privée (hors agenda public sauf admins / organisateur / inscrits). */
  const [isPrivate, setIsPrivate] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);
  const [markAsBeta, setMarkAsBeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** En édition : ne pas descendre sous le nombre de participants déjà inscrits. */
  const [participantFloor, setParticipantFloor] = useState(
    EVENT_PARTICIPANT_MIN_MAX,
  );

  useEffect(() => {
    if (!isEditMode) {
      setParticipantFloor(EVENT_PARTICIPANT_MIN_MAX);
      setMaxParticipants(String(participantMaxCap));
      setIsPrivate(false);
      return;
    }
    const ev = getEventById(formEventId);
    if (!ev || (!eventIsEditableByViewer(ev) && !isAdmin)) {
      window.alert("Impossible d'ouvrir cette sortie en édition.");
      closeDetail();
      return;
    }
    setTitle(ev.title.slice(0, MAX_TITLE_LEN));
    setLocation(ev.location.slice(0, MAX_LOCATION_LEN));
    setDescription((ev.notes ?? "").slice(0, MAX_DESCRIPTION_LEN));
    setMaxParticipants(String(ev.participantMax));
    setEventDate(roundDateToQuarterHour(dateFromEvent(ev)));
    setImageUri(ev.imageUri);
    setHideAddress(ev.hideAddress ?? false);
    setIsPrivate(ev.isPrivate ?? false);
    setManualApproval(ev.manualApproval ?? false);
    setMarkAsBeta(ev.isBeta ?? false);
    setParticipantFloor(
      Math.max(EVENT_PARTICIPANT_MIN_MAX, ev.participantCount),
    );
  }, [isEditMode, formEventId, getEventById, closeDetail, isAdmin]);

  useEffect(() => {
    setMaxParticipants((prev) => {
      const n = parseInt(prev, 10);
      const cur = Number.isFinite(n) ? n : participantMaxCap;
      const next = Math.min(participantMaxCap, Math.max(participantFloor, cur));
      return String(next);
    });
  }, [participantMaxCap, participantFloor]);

  const dateInputValue = useMemo(() => toIsoDateKey(eventDate), [eventDate]);
  const timeInputValue = useMemo(
    () =>
      `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`,
    [eventDate],
  );

  const maxN = useMemo(() => parseInt(maxParticipants, 10), [maxParticipants]);
  const maxValid = Number.isFinite(maxN) ? maxN : participantMaxCap;

  const selectedDefaultCoverId = useMemo(() => {
    if (!imageUri) return null;
    return findDefaultCoverThemeByImageUrl(imageUri)?.id ?? null;
  }, [imageUri]);

  const bumpMax = useCallback(
    (delta: number) => {
      setMaxParticipants((p) => {
        const n = parseInt(p, 10);
        const cur = Number.isFinite(n) ? n : participantMaxCap;
        const next = Math.min(
          participantMaxCap,
          Math.max(participantFloor, cur + delta),
        );
        return String(next);
      });
    },
    [participantFloor, participantMaxCap],
  );

  const onDateChange = useCallback((v: string) => {
    if (!v) return;
    const d = new Date(v + "T12:00:00");
    if (Number.isNaN(d.getTime())) return;
    setEventDate((prev) => {
      const nd = new Date(prev);
      nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return nd;
    });
  }, []);

  const onTimeChange = useCallback((v: string) => {
    if (!v?.includes(":")) return;
    const [h, m] = v.split(":");
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
    setEventDate((prev) => {
      const nd = new Date(prev);
      nd.setHours(hh, mm, 0, 0);
      return nd;
    });
  }, []);

  const pickImage = useCallback(() => {
    if (uploadingEventCover) return;
    coverInputRef.current?.click();
  }, [uploadingEventCover]);

  const selectThemeCover = useCallback((theme: DefaultEventCoverTheme) => {
    setImageUri(theme.imageUrl);
    setCoverImageNonce((n) => n + 1);
    const tagToken = `#${theme.tag}`;
    setDescription((prev) => {
      if (foldNorm(prev).includes(foldNorm(tagToken))) return prev;
      const base = prev.trimEnd();
      const next = `${base}\n\n${tagToken}`;
      return next.length > MAX_DESCRIPTION_LEN
        ? next.slice(0, MAX_DESCRIPTION_LEN)
        : next;
    });
  }, []);

  const onCoverFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;

      setUploadingEventCover(true);
      try {
        const userKey = getNelProfileImageKitUserKey();
        const uploadedUrl = await uploadLocalImageToImageKitEventCover({
          webFile: file,
          mimeType: file.type || null,
          userKey,
        });
        setImageUri(withUrlUploadVersion(uploadedUrl));
        setCoverImageNonce((n) => n + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        window.alert(msg || "Échec de l’envoi de l’image.");
      } finally {
        setUploadingEventCover(false);
      }
    },
    [],
  );

  const reportSubmitError = useCallback((message: string) => {
    const text = message.trim();
    if (!text) return;
    setSubmitError(text);
  }, []);

  const submit = useCallback(() => {
    setSubmitError(null);
    const titleTrim = title.trim().slice(0, MAX_TITLE_LEN);
    const locationTrim = location.trim().slice(0, MAX_LOCATION_LEN);
    const parsed = eventDate;
    const timeShortStr = eventDate.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const maxParsed = parseInt(maxParticipants.trim(), 10);

    if (!titleTrim) {
      reportSubmitError(t("createEventErrorTitle"));
      return;
    }
    if (!locationTrim) {
      reportSubmitError(t("createEventErrorLocation"));
      return;
    }
    if (
      !Number.isFinite(maxParsed) ||
      maxParsed < participantFloor ||
      maxParsed > participantMaxCap ||
      maxParsed < EVENT_PARTICIPANT_MIN_MAX
    ) {
      reportSubmitError(
        t("createEventParticipantsRangeAlert")
          .replace("{min}", String(Math.max(participantFloor, EVENT_PARTICIPANT_MIN_MAX)))
          .replace("{max}", String(participantMaxCap)),
      );
      return;
    }

    setSubmitting(true);
    try {
      const cappedMax = Math.min(maxParsed, participantMaxCap);
      const dateKey = toIsoDateKey(parsed);
      const sectionDateLabel = frenchSectionLabel(parsed);
      const dateLabel = frenchShortDate(parsed);
      const notesTrim = description.trim();
      const notesVal = notesTrim
        ? notesTrim.slice(0, MAX_DESCRIPTION_LEN)
        : undefined;
      const timeShortVal = timeShortStr || "19:00";
      const beta = isAdmin && markAsBeta;

      if (isEditMode) {
        const existing = getEventById(formEventId);
        if (!existing) {
          reportSubmitError(t("createEventErrorNotFound"));
          return;
        }
        updateEvent(formEventId, {
          title: titleTrim,
          dateLabel,
          location: locationTrim,
          notes: notesVal,
          timeShort: timeShortVal,
          imageUri: imageUri ?? undefined,
          participantMax: cappedMax,
          dateKey,
          sectionDateLabel,
          hideAddress,
          isPrivate,
          manualApproval,
          isBeta: beta,
        });
      } else {
        const groupTitle = `${titleTrim} — ${dateLabel.split(" ")[0]}`;
        const conversationId = createEmptyGroup(groupTitle);
        const eventId = addEvent({
          conversationId,
          title: titleTrim,
          dateLabel,
          location: locationTrim,
          notes: notesVal,
          timeShort: timeShortVal,
          priceLabel: "Gratuit",
          imageUri: imageUri ?? undefined,
          participantMax: cappedMax,
          dateKey,
          sectionDateLabel,
          hideAddress,
          isPrivate,
          manualApproval,
          isBeta: beta,
        });
        if (!eventId) {
          reportSubmitError(t("createEventErrorGeneric"));
          return;
        }
        postEventGroupWelcome(conversationId, titleTrim);
        if ((viewerProAccess || isAdmin) && selectedInviteProfilIds.length > 0) {
          for (const profilId of selectedInviteProfilIds) {
            inviteProfilToEvent(eventId, profilId);
          }
        }
      }
      closeDetail();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("createEventErrorGeneric");
      reportSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    location,
    description,
    maxParticipants,
    eventDate,
    imageUri,
    hideAddress,
    isPrivate,
    manualApproval,
    markAsBeta,
    isAdmin,
    isEditMode,
    formEventId,
    addEvent,
    updateEvent,
    createEmptyGroup,
    postEventGroupWelcome,
    closeDetail,
    participantFloor,
    participantMaxCap,
    t,
    viewerProAccess,
    selectedInviteProfilIds,
    friends,
    inviteProfilToEvent,
    reportSubmitError,
    getEventById,
  ]);

  const handleCancelSortie = useCallback(() => {
    if (!isEditMode) return;
    if (
      !window.confirm(
        "Annuler définitivement cette sortie ? Elle disparaîtra de la liste et le groupe de discussion sera supprimé.",
      )
    ) {
      return;
    }
    cancelEvent(formEventId);
    popDetails(2);
  }, [isEditMode, formEventId, cancelEvent, popDetails]);

  return (
    <div className="create-event-page">
      <div className="ce-bg-gradient" aria-hidden />

      <header className="ce-header">
        <button
          type="button"
          className="ce-header-btn"
          onClick={closeDetail}
          aria-label="Fermer"
        >
          <X size={26} color="#fff" />
        </button>
        <h1 className="ce-header-title">
          {isEditMode ? t("editEventTitle") : t("createEventTitle")}
        </h1>
        <button
          type="button"
          className="ce-header-create"
          onClick={submit}
          disabled={submitting || uploadingEventCover}
          aria-label={isEditMode ? t("saveButton") : t("createButton")}
        >
          {isEditMode ? t("saveButton") : t("createButton")}
        </button>
      </header>

      <div className="ce-scroll">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onCoverFileChange}
        />

        <div className="ce-cover-default-block">
          <p className="ce-cover-default-label">{t("coverThemeIntro")}</p>
          <div
            className="ce-cover-default-scroll"
            role="list"
            aria-label="Couvertures suggérées par thème"
          >
            {DEFAULT_EVENT_COVER_THEMES.map((theme) => {
              const selected = selectedDefaultCoverId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`ce-cover-default-chip${selected ? " ce-cover-default-chip--selected" : ""}`}
                  onClick={() => selectThemeCover(theme)}
                  aria-pressed={selected}
                  aria-label={`Couverture ${theme.tag}`}
                >
                  <img
                    src={theme.imageUrl}
                    alt=""
                    className="ce-cover-default-thumb"
                    loading="lazy"
                  />
                  <span className="ce-cover-default-tag">#{theme.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="ce-photo-zone"
          onClick={pickImage}
          disabled={uploadingEventCover}
          aria-label="Ajouter une photo de couverture"
        >
          {imageUri ? (
            <>
              <img
                key={`cover-${coverImageNonce}`}
                src={imageUri}
                alt=""
                className="ce-photo-preview"
              />
              <div className="ce-photo-edit-badge">
                <Pencil size={14} color="#fff" aria-hidden />
                <span>Modifier</span>
              </div>
            </>
          ) : (
            <div className="ce-photo-placeholder">
              <div className="ce-photo-icon-circle">
                <Camera size={32} color="#fff" aria-hidden />
              </div>
              <p className="ce-photo-hint">Ajouter une photo de couverture</p>
            </div>
          )}
          {uploadingEventCover ? (
            <div className="ce-photo-upload-overlay">
              <Loader2
                className="ce-photo-spinner"
                size={36}
                color="#fff"
                aria-hidden
              />
              <span>Envoi…</span>
            </div>
          ) : null}
        </button>

        <div className="ce-card">
          <textarea
            className="ce-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'événement"
            rows={2}
            maxLength={MAX_TITLE_LEN}
          />
        </div>

        <div className="ce-card">
          <span className="ce-block-label">Date et heure</span>
          <div className="ce-web-date-row">
            <div style={{ flex: 1 }}>
              <p className="ce-web-date-hint">Date</p>
              <input
                className="ce-web-date-input"
                type="date"
                value={dateInputValue}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p className="ce-web-date-hint">Heure</p>
              <input
                className="ce-web-date-input"
                type="time"
                value={timeInputValue}
                onChange={(e) => onTimeChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="ce-lieu-max-row">
          <div className="ce-lieu-col">
            <div className="ce-inline-label-row">
              <MapPin size={18} color="#fff" aria-hidden />
              <span className="ce-inline-label">{t("locationLabel")}</span>
            </div>
            <input
              className="ce-lieu-field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("locationExample")}
              maxLength={MAX_LOCATION_LEN}
            />
          </div>
          <div className="ce-max-col">
            <div className="ce-inline-label-row">
              <Users size={18} color="#fff" aria-hidden />
              <span className="ce-inline-label">{t("maxLabel")}</span>
            </div>
            <div className="ce-max-field">
              <span className="ce-max-field-value">{maxParticipants}</span>
              <div className="ce-stepper">
                <button
                  type="button"
                  className="ce-stepper-btn"
                  onClick={() => bumpMax(1)}
                  disabled={maxValid >= participantMaxCap}
                  aria-label={t("increaseMax")}
                >
                  <ChevronUp size={18} color="#fff" />
                </button>
                <button
                  type="button"
                  className="ce-stepper-btn"
                  onClick={() => bumpMax(-1)}
                  disabled={maxValid <= participantFloor}
                  aria-label={t("decreaseMax")}
                >
                  <ChevronDown size={18} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ce-card-section">
          <h2 className="ce-section-title">{t("aboutSectionTitle")}</h2>
          <div className="ce-card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <textarea
              className="ce-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              maxLength={MAX_DESCRIPTION_LEN}
            />
          </div>
        </div>

        <div className="ce-card-section">
          <h2 className="ce-section-title">{t("optionsSectionTitle")}</h2>
          <div className="ce-card" style={{ marginBottom: 0 }}>
            {(viewerProAccess || isAdmin) && !isEditMode && (
              <div className="ce-invite-block ce-option-row--border">
                <div className="ce-invite-head">
                  <div className="ce-option-bg ce-option-bg--teal">
                    <Users size={18} color="#fff" aria-hidden />
                  </div>
                  <div className="ce-option-text">
                    <span className="ce-option-label">
                      {isAdmin ? t("adminInviteSection") : t("inviteFriendsSection")}
                    </span>
                    <span className="ce-option-sublabel">
                      {selectedInviteProfilIds.length > 0
                        ? selectedInviteProfilIds.length === 1
                          ? t("createEventInviteSelectedOne")
                          : t("createEventInviteSelectedMany").replace(
                              "{{n}}",
                              String(selectedInviteProfilIds.length),
                            )
                        : isAdmin
                          ? t("adminInviteHint")
                          : t("inviteHint")}
                    </span>
                  </div>
                  <div className="ce-invite-actions">
                    <button
                      type="button"
                      className="ce-invite-action-btn"
                      onClick={selectAllInviteFriends}
                      disabled={inviteableProfiles.length === 0}
                    >
                      {isAdmin
                        ? t("adminInviteAll").replace(
                            "{{n}}",
                            String(inviteableProfiles.length),
                          )
                        : t("createEventInviteAll")}
                    </button>
                    <button
                      type="button"
                      className="ce-invite-action-btn ce-invite-action-btn--muted"
                      onClick={clearInviteFriends}
                      disabled={selectedInviteProfilIds.length === 0}
                    >
                      {t("createEventInviteNone")}
                    </button>
                  </div>
                </div>
                {inviteableProfiles.length > 0 ? (
                  <div className="ce-invite-friends">
                    {inviteableProfiles.map((p) => {
                      const selected = selectedInviteProfilIds.includes(p.profilId);
                      const firstName =
                        p.name.trim().split(/\s+/)[0] || p.name.trim() || p.name;
                      return (
                        <button
                          key={p.profilId}
                          type="button"
                          className={`ce-invite-chip${selected ? " ce-invite-chip--selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => toggleInviteFriend(p.profilId)}
                        >
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="ce-invite-chip-av"
                          />
                          <span className="ce-invite-chip-name">{firstName}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="ce-invite-empty">{t("noFriends")}</p>
                )}
              </div>
            )}
            <div className="ce-option-row ce-option-row--border">
              <div className="ce-option-bg">
                <EyeOff size={18} color="#fff" aria-hidden />
              </div>
              <div className="ce-option-text">
                <span className="ce-option-label">{t("hideAddressLabel")}</span>
                <span className="ce-option-sublabel">{t("hideAddressHint")}</span>
              </div>
              <label className="ce-switch">
                <input
                  type="checkbox"
                  checked={hideAddress}
                  onChange={() => setHideAddress((h) => !h)}
                />
                <span className="ce-switch-slider" />
              </label>
            </div>
            <div className="ce-option-row ce-option-row--border">
              <div className="ce-option-bg ce-option-bg--indigo">
                <Lock size={18} color="#fff" aria-hidden />
              </div>
              <div className="ce-option-text">
                <span className="ce-option-label">
                  {t("privateEventToggle")}
                </span>
                <span className="ce-option-sublabel">
                  {t("privateEventHint")}
                </span>
              </div>
              <label className="ce-switch">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={() => setIsPrivate((v) => !v)}
                  aria-label={t("privateEventToggle")}
                />
                <span className="ce-switch-slider ce-switch-slider--indigo" />
              </label>
            </div>
            <div
              className={`ce-option-row ${isAdmin ? "ce-option-row--border" : ""}`}
            >
              <div className="ce-option-bg ce-option-bg--amber">
                <ShieldCheck size={18} color="#fff" aria-hidden />
              </div>
              <div className="ce-option-text">
                <span className="ce-option-label">{t("manualApprovalLabel")}</span>
                <span className="ce-option-sublabel">{t("manualApprovalHint")}</span>
              </div>
              <label className="ce-switch">
                <input
                  type="checkbox"
                  checked={manualApproval}
                  onChange={() => setManualApproval((h) => !h)}
                />
                <span className="ce-switch-slider ce-switch-slider--amber" />
              </label>
            </div>
            {isAdmin ? (
              <div className="ce-option-row">
                <div className="ce-option-bg ce-option-bg--pink">
                  <FlaskConical size={18} color="#fff" aria-hidden />
                </div>
                <div className="ce-option-text">
                  <span className="ce-option-label">Sortie bêta</span>
                  <span className="ce-option-sublabel">
                    Marquer comme pilote (admin)
                  </span>
                </div>
                <label className="ce-switch">
                  <input
                    type="checkbox"
                    checked={markAsBeta}
                    onChange={() => setMarkAsBeta((h) => !h)}
                  />
                  <span className="ce-switch-slider ce-switch-slider--pink" />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {isEditMode ? (
          <div className="ce-cancel-sortie-block">
            <button
              type="button"
              className="ce-cancel-sortie-btn"
              onClick={handleCancelSortie}
            >
              <Trash2 size={18} color="#ff453a" aria-hidden />
              <span>Annuler la sortie</span>
            </button>
            <p className="ce-cancel-sortie-hint">
              Action définitive : la sortie et son groupe de chat sont
              supprimés.
            </p>
          </div>
        ) : null}

        {submitError ? (
          <p className="ce-submit-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="ce-bottom-actions">
          <button type="button" className="ce-cancel-btn" onClick={closeDetail}>
            {isEditMode ? "Fermer" : "Annuler"}
          </button>
          <button
            type="button"
            className="ce-create-btn"
            onClick={submit}
            disabled={submitting || uploadingEventCover}
            aria-label={
              isEditMode
                ? "Enregistrer les modifications"
                : viewerProAccess
                  ? `Créer l'événement, +${KARMA_ORGANIZE_SUCCESS_REWARD} karma si sortie réussie`
                  : `Créer l'événement, −${KARMA_ORGANIZE_COST} karma, +${KARMA_ORGANIZE_SUCCESS_REWARD} karma si sortie réussie`
            }
          >
            <span className="ce-create-btn-label">
              {isEditMode ? "✨ Enregistrer" : "✨ Créer l'événement"}
            </span>
            {!isEditMode ? (
              <span className="ce-create-btn-karma" aria-hidden>
                {viewerProAccess
                  ? t("createEventKarmaFree")
                  : t("createEventKarmaCost").replace(
                      "{cost}",
                      String(KARMA_ORGANIZE_COST),
                    )}
                {" · "}
                {t("createEventKarmaReward").replace(
                  "{reward}",
                  String(KARMA_ORGANIZE_SUCCESS_REWARD),
                )}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
