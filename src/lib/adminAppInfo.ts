export interface AdminAppInfo {
  splashScreenEnabled: boolean;
  announcementModalEnabled: boolean;
  announcementModalDismissible: boolean;
  announcementMessage: string;
  /** Incrémenté à chaque publication pour réafficher la modale aux utilisateurs. */
  announcementRevision: number;
}

export const DEFAULT_ADMIN_APP_INFO: AdminAppInfo = {
  splashScreenEnabled: true,
  announcementModalEnabled: false,
  announcementModalDismissible: true,
  announcementMessage: "",
  announcementRevision: 0,
};

export const LS_ADMIN_APP_INFO = "nel_admin_app_info";
export const LS_ANNOUNCEMENT_DISMISSED_REVISION = "nel_announcement_dismissed_revision";

export function readAdminAppInfo(): AdminAppInfo {
  try {
    const raw = localStorage.getItem(LS_ADMIN_APP_INFO);
    if (!raw) return { ...DEFAULT_ADMIN_APP_INFO };
    const parsed = JSON.parse(raw) as Partial<AdminAppInfo>;
    return {
      splashScreenEnabled:
        parsed.splashScreenEnabled ?? DEFAULT_ADMIN_APP_INFO.splashScreenEnabled,
      announcementModalEnabled:
        parsed.announcementModalEnabled ??
        DEFAULT_ADMIN_APP_INFO.announcementModalEnabled,
      announcementModalDismissible:
        parsed.announcementModalDismissible ??
        DEFAULT_ADMIN_APP_INFO.announcementModalDismissible,
      announcementMessage:
        typeof parsed.announcementMessage === "string"
          ? parsed.announcementMessage
          : DEFAULT_ADMIN_APP_INFO.announcementMessage,
      announcementRevision:
        typeof parsed.announcementRevision === "number" &&
        Number.isFinite(parsed.announcementRevision)
          ? parsed.announcementRevision
          : DEFAULT_ADMIN_APP_INFO.announcementRevision,
    };
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
