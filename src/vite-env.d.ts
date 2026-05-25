/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGEKIT_PRIVATE_KEY?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}
