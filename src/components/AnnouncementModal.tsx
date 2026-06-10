import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  markAnnouncementDismissed,
  readAnnouncementDismissedRevision,
} from "../lib/adminAppInfo";
import "./AnnouncementModal.css";

interface AnnouncementModalProps {
  /** false pendant le splash screen — la modale n’apparaît qu’après. */
  ready?: boolean;
}

export function AnnouncementModal({ ready = true }: AnnouncementModalProps) {
  const { t } = useTranslation();
  const adminAppInfo = useMessagingStore((s) => s.adminAppInfo);
  const {
    announcementModalEnabled,
    announcementModalDismissible,
    announcementMessage,
    announcementRevision,
  } = adminAppInfo;

  const [dismissedRevision, setDismissedRevision] = useState(() =>
    readAnnouncementDismissedRevision(),
  );

  useEffect(() => {
    setDismissedRevision(readAnnouncementDismissedRevision());
  }, [announcementRevision]);

  const message = announcementMessage.trim();
  const visible =
    ready &&
    announcementModalEnabled &&
    message.length > 0 &&
    dismissedRevision < announcementRevision;

  if (!visible) return null;

  const handleClose = () => {
    markAnnouncementDismissed(announcementRevision);
    setDismissedRevision(announcementRevision);
  };

  return createPortal(
    <div
      className="announcement-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      <div className="announcement-modal-card">
        {announcementModalDismissible ? (
          <button
            type="button"
            className="announcement-modal-close"
            onClick={handleClose}
            aria-label={t("close")}
          >
            <X size={22} />
          </button>
        ) : null}
        <h2 id="announcement-modal-title" className="announcement-modal-title">
          {t("announcementModalTitle")}
        </h2>
        <p className="announcement-modal-body">{message}</p>
      </div>
    </div>,
    document.body,
  );
}
