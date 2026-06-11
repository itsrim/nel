import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  markForceReloadAckRevision,
  readForceReloadAckRevision,
} from "../lib/adminAppInfo";
import "./AppForceReloadModal.css";

export function AppForceReloadModal() {
  const { t } = useTranslation();
  const forceReloadRevision = useMessagingStore(
    (s) => s.adminAppInfo.forceReloadRevision,
  );
  const ackRevision = readForceReloadAckRevision();
  const needsReload =
    forceReloadRevision > 0 && forceReloadRevision > ackRevision;

  if (!needsReload) return null;

  const handleReload = () => {
    markForceReloadAckRevision(forceReloadRevision);
    window.location.reload();
  };

  return createPortal(
    <div
      className="app-force-reload-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-force-reload-title"
    >
      <div className="app-force-reload-card">
        <RefreshCw size={32} className="app-force-reload-icon" aria-hidden />
        <h2 id="app-force-reload-title" className="app-force-reload-title">
          {t("appForceReloadTitle")}
        </h2>
        <p className="app-force-reload-body">{t("appForceReloadBody")}</p>
        <button
          type="button"
          className="app-force-reload-btn"
          onClick={handleReload}
        >
          {t("appForceReloadAction")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
