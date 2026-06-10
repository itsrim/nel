/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGEKIT_PRIVATE_KEY?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** URL Google Sheet encodée (décalage +1 par caractère). */
  readonly VITE_GOOGLE_SHEETS_URL_ENCODED?: string;
  /** URL Apps Script (POST/PUT). */
  readonly VITE_GOOGLE_SHEETS_API_URL?: string;
  readonly VITE_SHEET_GID_MESSAGES?: string;
  readonly VITE_SHEET_GID_EVENTS?: string;
  readonly VITE_SHEET_GID_CONVERSATIONS?: string;
  readonly VITE_SHEET_GID_PROFILES?: string;
  readonly VITE_SHEET_GID_SUGGESTIONS?: string;
  readonly VITE_SHEET_GID_VIEWER_SETTINGS?: string;
  readonly VITE_SHEET_GID_PROFILE_VISITS?: string;
  readonly VITE_SHEET_GID_NOTIFICATIONS?: string;
  readonly VITE_SHEET_GID_ADMIN_REPORTS?: string;
  readonly VITE_SHEET_GID_PROFESSIONALS?: string;
  readonly VITE_SHEET_GID_APP_CONFIG?: string;
  readonly VITE_DEFAULT_CSV_PATH?: string;
}
