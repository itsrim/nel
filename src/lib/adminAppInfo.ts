export interface AdminAppInfo {
  splashScreenEnabled: boolean;
  announcementModalEnabled: boolean;
  announcementModalDismissible: boolean;
  announcementMessage: string;
  /** Incrémenté à chaque publication pour réafficher la modale aux utilisateurs. */
  announcementRevision: number;
  /** Si activé, « Publier à tous » impose aussi un rechargement de l'app. */
  forceAppReloadOnPublish: boolean;
  /** Incrémenté quand l'admin impose un rechargement — comparé côté client. */
  forceReloadRevision: number;
}

export const APP_CONFIG_GLOBAL_ID = "global";

export const DEFAULT_ADMIN_APP_INFO: AdminAppInfo = {
  splashScreenEnabled: true,
  announcementModalEnabled: false,
  announcementModalDismissible: true,
  announcementMessage: "",
  announcementRevision: 0,
  forceAppReloadOnPublish: false,
  forceReloadRevision: 0,
};

export const LS_ADMIN_APP_INFO = "nel_admin_app_info";
export const LS_ANNOUNCEMENT_DISMISSED_REVISION = "nel_announcement_dismissed_revision";
export const LS_FORCE_RELOAD_ACK_REVISION = "nel_force_reload_ack_revision";

export function normalizeAdminAppInfo(
  partial: Partial<AdminAppInfo> | null | undefined,
): AdminAppInfo {
  if (!partial) return { ...DEFAULT_ADMIN_APP_INFO };
  return {
    splashScreenEnabled:
      partial.splashScreenEnabled ?? DEFAULT_ADMIN_APP_INFO.splashScreenEnabled,
    announcementModalEnabled:
      partial.announcementModalEnabled ??
      DEFAULT_ADMIN_APP_INFO.announcementModalEnabled,
    announcementModalDismissible:
      partial.announcementModalDismissible ??
      DEFAULT_ADMIN_APP_INFO.announcementModalDismissible,
    announcementMessage:
      typeof partial.announcementMessage === "string"
        ? partial.announcementMessage
        : DEFAULT_ADMIN_APP_INFO.announcementMessage,
    announcementRevision:
      typeof partial.announcementRevision === "number" &&
      Number.isFinite(partial.announcementRevision)
        ? partial.announcementRevision
        : DEFAULT_ADMIN_APP_INFO.announcementRevision,
    forceAppReloadOnPublish:
      partial.forceAppReloadOnPublish ??
      DEFAULT_ADMIN_APP_INFO.forceAppReloadOnPublish,
    forceReloadRevision:
      typeof partial.forceReloadRevision === "number" &&
      Number.isFinite(partial.forceReloadRevision)
        ? partial.forceReloadRevision
        : DEFAULT_ADMIN_APP_INFO.forceReloadRevision,
  };
}

export function readAdminAppInfo(): AdminAppInfo {
  try {
    const raw = localStorage.getItem(LS_ADMIN_APP_INFO);
    if (!raw) return { ...DEFAULT_ADMIN_APP_INFO };
    return normalizeAdminAppInfo(JSON.parse(raw) as Partial<AdminAppInfo>);
  } catch {
    return { ...DEFAULT_ADMIN_APP_INFO };
  }
}

export function writeAdminAppInfo(info: AdminAppInfo): void {
  try {
    localStorage.setItem(LS_ADMIN_APP_INFO, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

export function readAnnouncementDismissedRevision(): number {
  try {
    const raw = localStorage.getItem(LS_ANNOUNCEMENT_DISMISSED_REVISION);
    if (!raw) return -1;
    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function markAnnouncementDismissed(revision: number): void {
  try {
    localStorage.setItem(LS_ANNOUNCEMENT_DISMISSED_REVISION, String(revision));
  } catch {
    /* ignore */
  }
}

export function readForceReloadAckRevision(): number {
  try {
    const raw = localStorage.getItem(LS_FORCE_RELOAD_ACK_REVISION);
    if (!raw) return -1;
    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function markForceReloadAckRevision(revision: number): void {
  try {
    localStorage.setItem(LS_FORCE_RELOAD_ACK_REVISION, String(revision));
  } catch {
    /* ignore */
  }
}

/** Fusionne local + distant — la version la plus récente l'emporte. */
export function mergeAdminAppInfo(
  local: AdminAppInfo,
  remote: AdminAppInfo,
): AdminAppInfo {
  const remoteNorm = normalizeAdminAppInfo(remote);
  const localNorm = normalizeAdminAppInfo(local);
  const remoteScore =
    remoteNorm.announcementRevision * 1000 + remoteNorm.forceReloadRevision;
  const localScore =
    localNorm.announcementRevision * 1000 + localNorm.forceReloadRevision;
  return remoteScore >= localScore ? remoteNorm : localNorm;
}
