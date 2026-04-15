import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  EyeOff,
  FlaskConical,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { getNelProfileImageKitUserKey, uploadLocalImageToImageKitEventCover } from '../lib/imagekitUpload';
import { withUrlUploadVersion } from '../lib/versionRemoteAssetUrl';
import './CreateEventPage.css';

const MAX_PARTICIPANTS_CAP = 150;

function toIsoDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function frenchShortDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function frenchSectionLabel(d: Date): string {
  const raw = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function roundDateToQuarterHour(d: Date): Date {
  const ms = 1000 * 60 * 15;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

export function CreateEventPage() {
  const { closeDetail } = useNavigationStore();
  const { addEvent, createEmptyGroup, postEventGroupWelcome, nelDemoIsAdmin } = useMessagingStore();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('50');
  const [eventDate, setEventDate] = useState(() => roundDateToQuarterHour(new Date()));
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coverImageNonce, setCoverImageNonce] = useState(0);
  const [uploadingEventCover, setUploadingEventCover] = useState(false);
  const [hideAddress, setHideAddress] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);
  const [markAsBeta, setMarkAsBeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dateInputValue = useMemo(() => toIsoDateKey(eventDate), [eventDate]);
  const timeInputValue = useMemo(
    () =>
      `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`,
    [eventDate],
  );

  const maxN = useMemo(() => parseInt(maxParticipants, 10), [maxParticipants]);
  const maxValid = Number.isFinite(maxN) ? maxN : MAX_PARTICIPANTS_CAP;

  const bumpMax = useCallback((delta: number) => {
    setMaxParticipants((p) => {
      const n = parseInt(p, 10);
      const cur = Number.isFinite(n) ? n : MAX_PARTICIPANTS_CAP;
      const next = Math.min(MAX_PARTICIPANTS_CAP, Math.max(2, cur + delta));
      return String(next);
    });
  }, []);

  const onDateChange = useCallback((v: string) => {
    if (!v) return;
    const d = new Date(v + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return;
    setEventDate((prev) => {
      const nd = new Date(prev);
      nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return nd;
    });
  }, []);

  const onTimeChange = useCallback((v: string) => {
    if (!v?.includes(':')) return;
    const [h, m] = v.split(':');
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

  const onCoverFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

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
      window.alert(msg || 'Échec de l’envoi de l’image.');
    } finally {
      setUploadingEventCover(false);
    }
  }, []);

  const submit = useCallback(() => {
    const t = title.trim();
    const l = location.trim();
    const parsed = eventDate;
    const timeShortStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const maxParsed = parseInt(maxParticipants.trim(), 10);

    if (!t) {
      window.alert('Indiquez un titre pour votre événement.');
      return;
    }
    if (!l) {
      window.alert('Indiquez un lieu ou un point de rendez-vous.');
      return;
    }
    if (!Number.isFinite(maxParsed) || maxParsed < 2 || maxParsed > MAX_PARTICIPANTS_CAP) {
      window.alert(`Le nombre de participants doit être entre 2 et ${MAX_PARTICIPANTS_CAP}.`);
      return;
    }

    setSubmitting(true);
    try {
      const cappedMax = Math.min(maxParsed, MAX_PARTICIPANTS_CAP);
      const dateKey = toIsoDateKey(parsed);
      const conversationId = createEmptyGroup(`Sortie : ${t}`);
      addEvent({
        conversationId,
        title: t,
        dateLabel: frenchShortDate(parsed),
        location: l,
        notes: description.trim() || undefined,
        timeShort: timeShortStr || '19:00',
        priceLabel: 'Gratuit',
        imageUri: imageUri ?? undefined,
        participantMax: cappedMax,
        dateKey,
        sectionDateLabel: frenchSectionLabel(parsed),
        hideAddress,
        manualApproval,
        isBeta: nelDemoIsAdmin && markAsBeta,
      });
      postEventGroupWelcome(conversationId, t);
      closeDetail();
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
    manualApproval,
    markAsBeta,
    nelDemoIsAdmin,
    addEvent,
    createEmptyGroup,
    postEventGroupWelcome,
    closeDetail,
  ]);

  return (
    <div className="create-event-page">
      <div className="ce-bg-gradient" aria-hidden />

      <header className="ce-header">
        <button type="button" className="ce-header-btn" onClick={closeDetail} aria-label="Fermer">
          <X size={26} color="#fff" />
        </button>
        <h1 className="ce-header-title">Nouvelle Sortie</h1>
        <button
          type="button"
          className="ce-header-create"
          onClick={submit}
          disabled={submitting || uploadingEventCover}
          aria-label="Créer">
          Créer
        </button>
      </header>

      <div className="ce-scroll">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onCoverFileChange}
        />

        <button
          type="button"
          className="ce-photo-zone"
          onClick={pickImage}
          disabled={uploadingEventCover}
          aria-label="Ajouter une photo de couverture">
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
              <Loader2 className="ce-photo-spinner" size={36} color="#fff" aria-hidden />
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
            maxLength={60}
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
              <span className="ce-inline-label">Lieu</span>
            </div>
            <input
              className="ce-lieu-field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Parc Monceau"
            />
          </div>
          <div className="ce-max-col">
            <div className="ce-inline-label-row">
              <Users size={18} color="#fff" aria-hidden />
              <span className="ce-inline-label">Max</span>
            </div>
            <div className="ce-max-field">
              <span className="ce-max-field-value">{maxParticipants}</span>
              <div className="ce-stepper">
                <button
                  type="button"
                  className="ce-stepper-btn"
                  onClick={() => bumpMax(1)}
                  disabled={maxValid >= MAX_PARTICIPANTS_CAP}
                  aria-label="Augmenter le maximum">
                  <ChevronUp size={18} color="#fff" />
                </button>
                <button
                  type="button"
                  className="ce-stepper-btn"
                  onClick={() => bumpMax(-1)}
                  disabled={maxValid <= 2}
                  aria-label="Diminuer le maximum">
                  <ChevronDown size={18} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ce-card-section">
          <h2 className="ce-section-title">À PROPOS</h2>
          <div className="ce-card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <textarea
              className="ce-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez des détails, le déroulé, le matériel à prévoir..."
            />
          </div>
        </div>

        <div className="ce-card-section">
          <h2 className="ce-section-title">OPTIONS</h2>
          <div className="ce-card" style={{ marginBottom: 0 }}>
            <div className="ce-option-row ce-option-row--border">
              <div className="ce-option-bg">
                <EyeOff size={18} color="#fff" aria-hidden />
              </div>
              <div className="ce-option-text">
                <span className="ce-option-label">Masquer l&apos;adresse</span>
                <span className="ce-option-sublabel">Visible uniquement par les inscrits</span>
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
            <div className={`ce-option-row ${nelDemoIsAdmin ? 'ce-option-row--border' : ''}`}>
              <div className="ce-option-bg ce-option-bg--amber">
                <ShieldCheck size={18} color="#fff" aria-hidden />
              </div>
              <div className="ce-option-text">
                <span className="ce-option-label">Validation manuelle</span>
                <span className="ce-option-sublabel">Valider chaque inscription</span>
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
            {nelDemoIsAdmin ? (
              <div className="ce-option-row">
                <div className="ce-option-bg ce-option-bg--pink">
                  <FlaskConical size={18} color="#fff" aria-hidden />
                </div>
                <div className="ce-option-text">
                  <span className="ce-option-label">Sortie bêta</span>
                  <span className="ce-option-sublabel">Marquer comme pilote (admin)</span>
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

        <div className="ce-bottom-actions">
          <button type="button" className="ce-cancel-btn" onClick={closeDetail}>
            Annuler
          </button>
          <button
            type="button"
            className="ce-create-btn"
            onClick={submit}
            disabled={submitting || uploadingEventCover}
            aria-label="Créer l'événement">
            ✨ Créer l&apos;événement
          </button>
        </div>
      </div>
    </div>
  );
}
