export const DEFAULT_SPLASH_IMAGE = `${import.meta.env.BASE_URL}event-cover-themes/TOULOUSE.jpg`;

export interface AdminAppInfo {
  splashScreenEnabled: boolean;
  /** Image du splash (URL ImageKit ou autre) — vide = image par défaut. */
  splashImageUrl: string;
  announcementModalEnabled: boolean;
  announcementModalDismissible: boolean;
  announcementMessage: string;
  /** Incrémenté à chaque publication pour réafficher la modale aux utilisateurs. */
  announcementRevision: number;
  /** Si activé, les nouveaux comptes sont validés sans email (backend lit app_config). */
  skipEmailVerification: boolean;
  /** Si activé, « Publier à tous » impose aussi un rechargement de l'app. */
  forceAppReloadOnPublish: boolean;
  /** Incrémenté quand l'admin impose un rechargement — comparé côté client. */
  forceReloadRevision: number;
  /** Horodatage de la dernière modification (sync Sheets). */
  configUpdatedAt?: number;
}

export const APP_CONFIG_GLOBAL_ID = "global";

export const DEFAULT_ADMIN_APP_INFO: AdminAppInfo = {
  splashScreenEnabled: true,
  splashImageUrl: "",
  announcementModalEnabled: false,
  announcementModalDismissible: true,
  announcementMessage: "",
  announcementRevision: 0,
  skipEmailVerification: false,
  forceAppReloadOnPublish: false,
  forceReloadRevision: 0,
  configUpdatedAt: 0,
};

export function resolveSplashImageUrl(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed || DEFAULT_SPLASH_IMAGE;
}

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
    splashImageUrl:
      typeof partial.splashImageUrl === "string"
        ? partial.splashImageUrl
        : DEFAULT_ADMIN_APP_INFO.splashImageUrl,
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
    skipEmailVerification:
      partial.skipEmailVerification ??
      DEFAULT_ADMIN_APP_INFO.skipEmailVerification,
    forceAppReloadOnPublish:
      partial.forceAppReloadOnPublish ??
      DEFAULT_ADMIN_APP_INFO.forceAppReloadOnPublish,
    forceReloadRevision:
      typeof partial.forceReloadRevision === "number" &&
      Number.isFinite(partial.forceReloadRevision)
        ? partial.forceReloadRevision
        : DEFAULT_ADMIN_APP_INFO.forceReloadRevision,
    configUpdatedAt:
      typeof partial.configUpdatedAt === "number" &&
      Number.isFinite(partial.configUpdatedAt)
        ? partial.configUpdatedAt
        : DEFAULT_ADMIN_APP_INFO.configUpdatedAt,
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
  const remoteAt = remoteNorm.configUpdatedAt ?? 0;
  const localAt = localNorm.configUpdatedAt ?? 0;
  if (remoteAt !== localAt) {
    return remoteAt > localAt ? remoteNorm : localNorm;
  }
  const remoteScore =
    remoteNorm.announcementRevision * 1000 + remoteNorm.forceReloadRevision;
  const localScore =
    localNorm.announcementRevision * 1000 + localNorm.forceReloadRevision;
  return remoteScore >= localScore ? remoteNorm : localNorm;
}
